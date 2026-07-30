const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');
const { queues } = require('../../config/queues');

async function listCampaigns(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId];
  const conditions = ['org_id = $1'];

  if (queryParams.status) {
    params.push(queryParams.status);
    conditions.push(`status = $${params.length}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM campaigns ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT c.*, u.name as created_by_name,
            (SELECT row_to_json(cr) FROM campaign_runs cr WHERE cr.campaign_id = c.id ORDER BY cr.started_at DESC LIMIT 1) as last_run
     FROM campaigns c
     LEFT JOIN users u ON u.id = c.created_by
     ${where} ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function createCampaign(orgId, data, userId) {
  if (!data.name) {
    const err = new Error('Campaign name is required');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO campaigns (org_id, name, audience_type, segment_filters, template_id, schedule_at, compliance_notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      orgId, data.name, data.audience_type || 'all',
      JSON.stringify(data.segment_filters || {}),
      data.template_id || null, data.schedule_at || null,
      data.compliance_notes || null, userId,
    ]
  );
  return result.rows[0];
}

async function getCampaign(orgId, campaignId) {
  const result = await query(
    `SELECT c.*, u.name as created_by_name, t.name as template_name, t.content as template_content
     FROM campaigns c
     LEFT JOIN users u ON u.id = c.created_by
     LEFT JOIN campaign_templates t ON t.id = c.template_id
     WHERE c.id = $1 AND c.org_id = $2`,
    [campaignId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }

  const runs = await query(
    'SELECT * FROM campaign_runs WHERE campaign_id = $1 ORDER BY started_at DESC LIMIT 5',
    [campaignId]
  );

  return { ...result.rows[0], runs: runs.rows };
}

async function updateCampaign(orgId, campaignId, updates) {
  const allowed = ['name','audience_type','segment_filters','template_id','schedule_at','compliance_notes'];
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(key === 'segment_filters' ? JSON.stringify(updates[key]) : updates[key]);
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push('updated_at = NOW()');
  params.push(campaignId, orgId);

  const result = await query(
    `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${idx} AND org_id = $${idx + 1} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function launchCampaign(orgId, campaignId, userId) {
  const campaignResult = await query(
    'SELECT * FROM campaigns WHERE id = $1 AND org_id = $2',
    [campaignId, orgId]
  );
  if (!campaignResult.rows.length) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }
  const campaign = campaignResult.rows[0];

  if (!campaign.is_approved) {
    const err = new Error('Campaign must be approved before launching');
    err.status = 400;
    throw err;
  }

  if (['running', 'completed'].includes(campaign.status)) {
    const err = new Error(`Campaign is already ${campaign.status}`);
    err.status = 400;
    throw err;
  }

  let contactsQuery = 'SELECT id FROM contacts WHERE org_id = $1 AND is_deleted = false';
  const contactsParams = [orgId];

  if (campaign.audience_type === 'segment' && campaign.segment_filters) {
    const filters = campaign.segment_filters;
    if (filters.lead_stage) {
      contactsParams.push(filters.lead_stage);
      contactsQuery += ` AND lead_stage = $${contactsParams.length}`;
    }
  }

  const contacts = await query(contactsQuery, contactsParams);

  await query(
    `UPDATE campaigns SET status = 'running', updated_at = NOW() WHERE id = $1`,
    [campaignId]
  );

  const runResult = await query(
    `INSERT INTO campaign_runs (campaign_id, org_id, total_targets)
     VALUES ($1,$2,$3) RETURNING id`,
    [campaignId, orgId, contacts.rows.length]
  );

  const runId = runResult.rows[0].id;

  for (const contact of contacts.rows) {
    await query(
      'INSERT INTO campaign_targets (campaign_id, contact_id) VALUES ($1,$2)',
      [campaignId, contact.id]
    );
  }

  await queues.campaigns.add('process-campaign', {
    campaignId, orgId, runId, userId,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

  return { campaignId, runId, totalTargets: contacts.rows.length, status: 'running' };
}

async function pauseCampaign(orgId, campaignId) {
  const result = await query(
    `UPDATE campaigns SET status = 'paused', updated_at = NOW()
     WHERE id = $1 AND org_id = $2 AND status = 'running'
     RETURNING *`,
    [campaignId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Campaign not found or not running');
    err.status = 400;
    throw err;
  }
  return result.rows[0];
}

async function approveCampaign(orgId, campaignId, userId) {
  const result = await query(
    `UPDATE campaigns SET is_approved = true, updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING *`,
    [campaignId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function getCampaignLogs(orgId, campaignId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);

  const countResult = await query(
    `SELECT COUNT(*) FROM campaign_targets ct
     JOIN campaigns c ON c.id = ct.campaign_id
     WHERE ct.campaign_id = $1 AND c.org_id = $2`,
    [campaignId, orgId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT ct.*, con.name as contact_name, con.phone as contact_phone
     FROM campaign_targets ct
     JOIN campaigns c ON c.id = ct.campaign_id
     JOIN contacts con ON con.id = ct.contact_id
     WHERE ct.campaign_id = $1 AND c.org_id = $2
     ORDER BY ct.sent_at DESC NULLS LAST LIMIT $3 OFFSET $4`,
    [campaignId, orgId, limit, offset]
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function listTemplates(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const countResult = await query('SELECT COUNT(*) FROM campaign_templates WHERE org_id = $1', [orgId]);
  const total = parseInt(countResult.rows[0].count);
  const result = await query(
    'SELECT * FROM campaign_templates WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [orgId, limit, offset]
  );
  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function createTemplate(orgId, data) {
  if (!data.name || !data.content) {
    const err = new Error('Template name and content are required');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO campaign_templates (org_id, name, category, content, variables)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [orgId, data.name, data.category || 'general', data.content, JSON.stringify(data.variables || [])]
  );
  return result.rows[0];
}

async function updateTemplate(orgId, templateId, updates) {
  const allowed = ['name','category','content','variables','is_active'];
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(key === 'variables' ? JSON.stringify(updates[key]) : updates[key]);
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push('updated_at = NOW()');
  params.push(templateId, orgId);

  const result = await query(
    `UPDATE campaign_templates SET ${fields.join(', ')} WHERE id = $${idx} AND org_id = $${idx + 1} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function deleteTemplate(orgId, templateId) {
  const result = await query(
    'DELETE FROM campaign_templates WHERE id = $1 AND org_id = $2 RETURNING id',
    [templateId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }
}

module.exports = {
  listCampaigns, createCampaign, getCampaign, updateCampaign,
  launchCampaign, pauseCampaign, approveCampaign, getCampaignLogs,
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
};

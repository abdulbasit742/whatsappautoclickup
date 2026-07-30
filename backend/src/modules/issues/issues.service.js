const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function listIssues(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId];
  const conditions = ['i.org_id = $1'];

  if (queryParams.status) {
    params.push(queryParams.status);
    conditions.push(`i.status = $${params.length}`);
  }
  if (queryParams.severity) {
    params.push(queryParams.severity);
    conditions.push(`i.severity = $${params.length}`);
  }
  if (queryParams.assigned_user_id) {
    params.push(queryParams.assigned_user_id);
    conditions.push(`i.assigned_user_id = $${params.length}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM issues i ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT i.*, c.name as contact_name, u.name as assigned_user_name
     FROM issues i
     LEFT JOIN contacts c ON c.id = i.contact_id
     LEFT JOIN users u ON u.id = i.assigned_user_id
     ${where} ORDER BY i.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function createIssue(orgId, data, userId) {
  if (!data.title) {
    const err = new Error('Issue title is required');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO issues (org_id, contact_id, conversation_id, assigned_user_id, title, description, severity, sla_due_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [orgId, data.contact_id || null, data.conversation_id || null,
     data.assigned_user_id || userId, data.title, data.description || null,
     data.severity || 'medium', data.sla_due_at || null]
  );
  return result.rows[0];
}

async function getIssue(orgId, issueId) {
  const result = await query(
    `SELECT i.*, c.name as contact_name, u.name as assigned_user_name
     FROM issues i
     LEFT JOIN contacts c ON c.id = i.contact_id
     LEFT JOIN users u ON u.id = i.assigned_user_id
     WHERE i.id = $1 AND i.org_id = $2`,
    [issueId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Issue not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function updateIssue(orgId, issueId, updates) {
  const allowed = ['title','description','severity','status','assigned_user_id','sla_due_at'];
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(updates[key]);
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push('updated_at = NOW()');
  params.push(issueId, orgId);

  const result = await query(
    `UPDATE issues SET ${fields.join(', ')} WHERE id = $${idx} AND org_id = $${idx + 1} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Issue not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function resolveIssue(orgId, issueId, resolutionNotes, userId) {
  const result = await query(
    `UPDATE issues SET status = 'resolved', resolved_at = NOW(), resolution_notes = $1, updated_at = NOW()
     WHERE id = $2 AND org_id = $3 RETURNING *`,
    [resolutionNotes || null, issueId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Issue not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function addComment(orgId, issueId, data, userId) {
  if (!data.content) {
    const err = new Error('Comment content is required');
    err.status = 400;
    throw err;
  }
  await getIssue(orgId, issueId);
  const result = await query(
    `INSERT INTO issue_comments (issue_id, org_id, user_id, content, is_internal)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [issueId, orgId, userId, data.content, data.is_internal || false]
  );
  return result.rows[0];
}

async function listComments(orgId, issueId) {
  const result = await query(
    `SELECT ic.*, u.name as user_name
     FROM issue_comments ic
     LEFT JOIN users u ON u.id = ic.user_id
     WHERE ic.issue_id = $1 AND ic.org_id = $2
     ORDER BY ic.created_at ASC`,
    [issueId, orgId]
  );
  return result.rows;
}

module.exports = { listIssues, createIssue, getIssue, updateIssue, resolveIssue, addComment, listComments };

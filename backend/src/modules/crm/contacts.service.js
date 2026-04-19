const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function listContacts(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId];
  const conditions = ['org_id = $1', 'is_deleted = false'];

  if (queryParams.search) {
    params.push(`%${queryParams.search}%`);
    conditions.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (queryParams.lead_stage) {
    params.push(queryParams.lead_stage);
    conditions.push(`lead_stage = $${params.length}`);
  }
  if (queryParams.assigned_user_id) {
    params.push(queryParams.assigned_user_id);
    conditions.push(`assigned_user_id = $${params.length}`);
  }
  if (queryParams.tag) {
    params.push(queryParams.tag);
    conditions.push(`$${params.length} = ANY(tags)`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM contacts ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT c.*, u.name as assigned_user_name
     FROM contacts c
     LEFT JOIN users u ON u.id = c.assigned_user_id
     ${where}
     ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function createContact(orgId, data, userId) {
  if (!data.name) {
    const err = new Error('Contact name is required');
    err.status = 400;
    throw err;
  }

  const result = await query(
    `INSERT INTO contacts (org_id, name, phone, email, city, country, tags, lead_stage, lead_source,
      assigned_user_id, notes, payment_status, lead_score, lead_value, custom_fields)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      orgId, data.name, data.phone || null, data.email || null,
      data.city || null, data.country || null,
      data.tags || [], data.lead_stage || 'New Lead', data.lead_source || null,
      data.assigned_user_id || userId, data.notes || null,
      data.payment_status || 'none', data.lead_score || 0, data.lead_value || 0,
      JSON.stringify(data.custom_fields || {}),
    ]
  );

  await query(
    `INSERT INTO activities (org_id, contact_id, user_id, type, description)
     VALUES ($1,$2,$3,'contact_created','Contact created')`,
    [orgId, result.rows[0].id, userId]
  );

  return result.rows[0];
}

async function getContact(orgId, contactId) {
  const result = await query(
    `SELECT c.*, u.name as assigned_user_name, u.email as assigned_user_email
     FROM contacts c
     LEFT JOIN users u ON u.id = c.assigned_user_id
     WHERE c.id = $1 AND c.org_id = $2 AND c.is_deleted = false`,
    [contactId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Contact not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function updateContact(orgId, contactId, updates, userId) {
  const allowed = [
    'name','phone','email','city','country','tags','lead_stage','lead_source',
    'assigned_user_id','notes','payment_status','lead_score','lead_value',
    'custom_fields','follow_up_due_at',
  ];

  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(
        key === 'tags' ? updates[key] :
        key === 'custom_fields' ? JSON.stringify(updates[key]) :
        updates[key]
      );
      idx++;
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  fields.push('updated_at = NOW()');
  params.push(contactId, orgId);

  const result = await query(
    `UPDATE contacts SET ${fields.join(', ')}
     WHERE id = $${idx} AND org_id = $${idx + 1} AND is_deleted = false
     RETURNING *`,
    params
  );

  if (!result.rows.length) {
    const err = new Error('Contact not found');
    err.status = 404;
    throw err;
  }

  await query(
    `INSERT INTO activities (org_id, contact_id, user_id, type, description)
     VALUES ($1,$2,$3,'contact_updated','Contact updated')`,
    [orgId, contactId, userId]
  );

  return result.rows[0];
}

async function deleteContact(orgId, contactId, userId) {
  const result = await query(
    `UPDATE contacts SET is_deleted = true, updated_at = NOW()
     WHERE id = $1 AND org_id = $2 RETURNING id`,
    [contactId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Contact not found');
    err.status = 404;
    throw err;
  }
  await query(
    `INSERT INTO activities (org_id, contact_id, user_id, type, description)
     VALUES ($1,$2,$3,'contact_deleted','Contact deleted')`,
    [orgId, contactId, userId]
  );
}

async function importContacts(orgId, file, body, userId) {
  if (!file) {
    const err = new Error('File is required');
    err.status = 400;
    throw err;
  }

  const content = file.buffer.toString('utf8');
  const lines = content.split('\n').filter(Boolean);
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

  let imported = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || null; });

    if (!row.name) { errors++; continue; }

    try {
      await query(
        `INSERT INTO contacts (org_id, name, phone, email, city, country, lead_stage)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [orgId, row.name, row.phone, row.email, row.city, row.country, row.lead_stage || 'New Lead']
      );
      imported++;
    } catch {
      errors++;
    }
  }

  await query(
    `INSERT INTO activities (org_id, user_id, type, description, metadata)
     VALUES ($1,$2,'contacts_imported',$3,$4)`,
    [orgId, userId, `Imported ${imported} contacts`, JSON.stringify({ imported, errors })]
  );

  return { imported, errors, total: lines.length - 1 };
}

async function exportContacts(orgId, queryParams) {
  const result = await query(
    `SELECT name, phone, email, city, country, lead_stage, lead_source, payment_status,
            lead_score, lead_value, created_at
     FROM contacts WHERE org_id = $1 AND is_deleted = false ORDER BY created_at DESC`,
    [orgId]
  );

  const headers = ['name','phone','email','city','country','lead_stage','lead_source',
                   'payment_status','lead_score','lead_value','created_at'];
  const rows = result.rows.map((r) =>
    headers.map((h) => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

async function addNote(orgId, contactId, content, userId) {
  if (!content) {
    const err = new Error('Note content is required');
    err.status = 400;
    throw err;
  }
  await getContact(orgId, contactId);

  const result = await query(
    `INSERT INTO contact_notes (contact_id, org_id, user_id, content)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [contactId, orgId, userId, content]
  );

  await query(
    'UPDATE contacts SET last_interaction_at = NOW() WHERE id = $1',
    [contactId]
  );

  return result.rows[0];
}

async function getNotes(orgId, contactId) {
  const result = await query(
    `SELECT cn.*, u.name as user_name FROM contact_notes cn
     LEFT JOIN users u ON u.id = cn.user_id
     WHERE cn.contact_id = $1 AND cn.org_id = $2
     ORDER BY cn.created_at DESC`,
    [contactId, orgId]
  );
  return result.rows;
}

async function logActivity(orgId, contactId, data, userId) {
  await getContact(orgId, contactId);
  const result = await query(
    `INSERT INTO activities (org_id, contact_id, user_id, type, description, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [orgId, contactId, userId, data.type || 'note', data.description || '', JSON.stringify(data.metadata || {})]
  );
  await query('UPDATE contacts SET last_interaction_at = NOW() WHERE id = $1', [contactId]);
  return result.rows[0];
}

async function getTimeline(orgId, contactId, queryParams) {
  const { limit, offset } = parsePagination(queryParams);
  const [activities, notes, messages] = await Promise.all([
    query(
      `SELECT 'activity' as type, id, type as subtype, description, metadata, created_at, user_id
       FROM activities WHERE contact_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [contactId, orgId, limit, offset]
    ),
    query(
      `SELECT 'note' as type, id, null as subtype, content as description, null as metadata, created_at, user_id
       FROM contact_notes WHERE contact_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [contactId, orgId, limit]
    ),
    query(
      `SELECT 'message' as type, cm.id, cm.message_type as subtype, cm.content as description,
              cm.metadata, cm.created_at, cm.sender_id as user_id
       FROM conversation_messages cm
       JOIN conversations c ON c.id = cm.conversation_id
       WHERE c.contact_id = $1 AND c.org_id = $2
       ORDER BY cm.created_at DESC LIMIT $3`,
      [contactId, orgId, limit]
    ),
  ]);

  const combined = [
    ...activities.rows.map((r) => ({ ...r, category: 'activity' })),
    ...notes.rows.map((r) => ({ ...r, category: 'note' })),
    ...messages.rows.map((r) => ({ ...r, category: 'message' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);

  return combined;
}

module.exports = {
  listContacts, createContact, getContact, updateContact, deleteContact,
  importContacts, exportContacts, addNote, getNotes, logActivity, getTimeline,
};

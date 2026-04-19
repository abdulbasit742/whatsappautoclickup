const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');

async function listFollowUps(orgId, queryParams, userId) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId];
  const conditions = ['org_id = $1'];

  if (queryParams.status) {
    params.push(queryParams.status);
    conditions.push(`status = $${params.length}`);
  }
  if (queryParams.assigned_user_id) {
    params.push(queryParams.assigned_user_id);
    conditions.push(`assigned_user_id = $${params.length}`);
  }
  if (queryParams.mine === 'true') {
    params.push(userId);
    conditions.push(`assigned_user_id = $${params.length}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM follow_ups ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT fu.*, c.name as contact_name, c.phone as contact_phone, u.name as assigned_user_name
     FROM follow_ups fu
     LEFT JOIN contacts c ON c.id = fu.contact_id
     LEFT JOIN users u ON u.id = fu.assigned_user_id
     ${where} ORDER BY fu.scheduled_at ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function createFollowUp(orgId, data, userId) {
  if (!data.scheduled_at) {
    const err = new Error('scheduled_at is required');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO follow_ups (org_id, contact_id, assigned_user_id, type, trigger_type, scheduled_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [orgId, data.contact_id || null, data.assigned_user_id || userId,
     data.type || 'call', data.trigger_type || 'manual', data.scheduled_at, data.notes || null]
  );

  if (data.contact_id) {
    await query(
      'UPDATE contacts SET follow_up_due_at = $1 WHERE id = $2 AND org_id = $3',
      [data.scheduled_at, data.contact_id, orgId]
    );
  }

  return result.rows[0];
}

async function getFollowUp(orgId, followUpId) {
  const result = await query(
    `SELECT fu.*, c.name as contact_name, u.name as assigned_user_name
     FROM follow_ups fu
     LEFT JOIN contacts c ON c.id = fu.contact_id
     LEFT JOIN users u ON u.id = fu.assigned_user_id
     WHERE fu.id = $1 AND fu.org_id = $2`,
    [followUpId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Follow-up not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function updateFollowUp(orgId, followUpId, updates) {
  const allowed = ['type','scheduled_at','notes','assigned_user_id','status'];
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
  params.push(followUpId, orgId);

  const result = await query(
    `UPDATE follow_ups SET ${fields.join(', ')} WHERE id = $${idx} AND org_id = $${idx + 1} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Follow-up not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function completeFollowUp(orgId, followUpId, userId) {
  const result = await query(
    `UPDATE follow_ups SET status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [followUpId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Follow-up not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function listReminders(orgId, userId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId, userId];
  const conditions = ['org_id = $1', 'user_id = $2'];

  if (queryParams.is_completed !== undefined) {
    params.push(queryParams.is_completed === 'true');
    conditions.push(`is_completed = $${params.length}`);
  } else {
    conditions.push('is_completed = false');
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM reminders ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT r.*, c.name as contact_name
     FROM reminders r
     LEFT JOIN contacts c ON c.id = r.contact_id
     ${where} ORDER BY r.due_at ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function createReminder(orgId, data, userId) {
  if (!data.title || !data.due_at) {
    const err = new Error('title and due_at are required');
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO reminders (org_id, user_id, contact_id, title, description, due_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [orgId, userId, data.contact_id || null, data.title, data.description || null, data.due_at]
  );
  return result.rows[0];
}

async function updateReminder(orgId, reminderId, updates, userId) {
  const allowed = ['title','description','due_at'];
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

  params.push(reminderId, orgId, userId);
  const result = await query(
    `UPDATE reminders SET ${fields.join(', ')} WHERE id = $${idx} AND org_id = $${idx + 1} AND user_id = $${idx + 2} RETURNING *`,
    params
  );
  if (!result.rows.length) {
    const err = new Error('Reminder not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function completeReminder(orgId, reminderId, userId) {
  const result = await query(
    `UPDATE reminders SET is_completed = true WHERE id = $1 AND org_id = $2 AND user_id = $3 RETURNING *`,
    [reminderId, orgId, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Reminder not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

module.exports = {
  listFollowUps, createFollowUp, getFollowUp, updateFollowUp, completeFollowUp,
  listReminders, createReminder, updateReminder, completeReminder,
};

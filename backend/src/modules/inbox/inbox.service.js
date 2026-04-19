const { query } = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../shared/utils/pagination');
const emitter = require('../../shared/events/eventEmitter');

async function listConversations(orgId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const params = [orgId];
  const conditions = ['c.org_id = $1'];

  if (queryParams.status) {
    params.push(queryParams.status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (queryParams.assigned_user_id) {
    params.push(queryParams.assigned_user_id);
    conditions.push(`c.assigned_user_id = $${params.length}`);
  }
  if (queryParams.channel) {
    params.push(queryParams.channel);
    conditions.push(`c.channel = $${params.length}`);
  }
  if (queryParams.is_archived !== undefined) {
    params.push(queryParams.is_archived === 'true');
    conditions.push(`c.is_archived = $${params.length}`);
  } else {
    conditions.push('c.is_archived = false');
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) FROM conversations c ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT c.*,
            ct.name as contact_name, ct.phone as contact_phone,
            u.name as assigned_user_name,
            (SELECT content FROM conversation_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
     FROM conversations c
     LEFT JOIN contacts ct ON ct.id = c.contact_id
     LEFT JOIN users u ON u.id = c.assigned_user_id
     ${where}
     ORDER BY c.last_message_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function createConversation(orgId, data, userId) {
  const result = await query(
    `INSERT INTO conversations (org_id, contact_id, assigned_user_id, channel, status, priority, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      orgId, data.contact_id || null, data.assigned_user_id || userId,
      data.channel || 'whatsapp', data.status || 'open',
      data.priority || 'normal', data.tags || [],
    ]
  );
  return result.rows[0];
}

async function getConversation(orgId, convId) {
  const result = await query(
    `SELECT c.*,
            ct.name as contact_name, ct.phone as contact_phone, ct.email as contact_email,
            u.name as assigned_user_name
     FROM conversations c
     LEFT JOIN contacts ct ON ct.id = c.contact_id
     LEFT JOIN users u ON u.id = c.assigned_user_id
     WHERE c.id = $1 AND c.org_id = $2`,
    [convId, orgId]
  );
  if (!result.rows.length) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

async function updateConversation(orgId, convId, updates, userId) {
  const allowed = ['status','assigned_user_id','priority','tags','is_archived'];
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
  params.push(convId, orgId);

  const result = await query(
    `UPDATE conversations SET ${fields.join(', ')}
     WHERE id = $${idx} AND org_id = $${idx + 1}
     RETURNING *`,
    params
  );

  if (!result.rows.length) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  emitter.emit('conversation:updated', { orgId, conversation: result.rows[0] });
  return result.rows[0];
}

async function sendMessage(orgId, convId, data, userId) {
  if (!data.content) {
    const err = new Error('Message content is required');
    err.status = 400;
    throw err;
  }

  await getConversation(orgId, convId);

  const result = await query(
    `INSERT INTO conversation_messages (conversation_id, org_id, sender_type, sender_id, content, message_type, metadata)
     VALUES ($1,$2,'agent',$3,$4,$5,$6) RETURNING *`,
    [convId, orgId, userId, data.content, data.message_type || 'text', JSON.stringify(data.metadata || {})]
  );

  await query(
    `UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [convId]
  );

  const message = result.rows[0];
  emitter.emit('message:new', { orgId, convId, message });
  return message;
}

async function listMessages(orgId, convId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  await getConversation(orgId, convId);

  const countResult = await query(
    'SELECT COUNT(*) FROM conversation_messages WHERE conversation_id = $1 AND org_id = $2',
    [convId, orgId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT cm.*, u.name as sender_name
     FROM conversation_messages cm
     LEFT JOIN users u ON u.id = cm.sender_id
     WHERE cm.conversation_id = $1 AND cm.org_id = $2
     ORDER BY cm.created_at ASC LIMIT $3 OFFSET $4`,
    [convId, orgId, limit, offset]
  );

  return { data: result.rows, meta: paginationMeta(total, page, limit) };
}

async function addInternalNote(orgId, convId, content, userId) {
  if (!content) {
    const err = new Error('Note content is required');
    err.status = 400;
    throw err;
  }
  await getConversation(orgId, convId);

  const result = await query(
    `INSERT INTO conversation_messages (conversation_id, org_id, sender_type, sender_id, content, is_internal_note)
     VALUES ($1,$2,'agent',$3,$4,true) RETURNING *`,
    [convId, orgId, userId, content]
  );
  return result.rows[0];
}

module.exports = {
  listConversations, createConversation, getConversation,
  updateConversation, sendMessage, listMessages, addInternalNote,
};

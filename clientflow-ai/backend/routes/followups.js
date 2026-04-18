const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendText } = require('../services/whatsappService');
const { generateAIResponse } = require('../services/aiService');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { status = 'pending', client_id } = req.query;
    let q = `SELECT f.*, c.name, c.whatsapp_number FROM follow_ups f
             JOIN clients c ON c.id=f.client_id WHERE f.status=$1`;
    const params = [status];
    if (client_id) { params.push(client_id); q += ` AND f.client_id=$${params.length}`; }
    q += ` ORDER BY f.scheduled_at ASC LIMIT 100`;
    res.json((await db.query(q, params)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, type, scheduled_at } = req.body;
    if (!client_id || !type || !scheduled_at) {
      return res.status(400).json({ error: 'client_id, type, and scheduled_at are required' });
    }
    const validTypes = ['cold_lead', 'pending_payment', 'post_delivery', 're_engagement', 'upsell'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid follow-up type' });

    const r = await db.query(
      `INSERT INTO follow_ups (client_id, type, scheduled_at) VALUES ($1,$2,$3) RETURNING *`,
      [client_id, type, scheduled_at]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/trigger/:id', async (req, res) => {
  try {
    const f = (await db.query(
      `SELECT f.*, c.whatsapp_number, c.name FROM follow_ups f
       JOIN clients c ON c.id=f.client_id WHERE f.id=$1`,
      [req.params.id]
    )).rows[0];
    if (!f) return res.status(404).json({ error: 'Follow-up not found' });

    let message = req.body.message;

    // If no custom message provided, generate based on type
    if (!message) {
      const name = f.name || 'there';
      if (f.type === 'cold_lead') {
        message = `Hello ${name}! 👋 Just checking in — we noticed you were interested in our services. We're still here to help! Any questions? 😊`;
      } else if (f.type === 'pending_payment') {
        message = `Hi ${name}! 😊 Just a friendly reminder — your payment is still pending. Let us know if you need any help with the transfer! 💙`;
      } else if (f.type === 'post_delivery') {
        message = `Hi ${name}! 🌟 Hope you're loving your service! Could you rate us from 1–5? Your feedback really helps us improve! ⭐`;
      } else if (f.type === 're_engagement') {
        message = `Assalam u Alaikum ${name}! 👋 It's been a while — we miss you! We have exciting new services. Reply to see what's new! 🎉`;
      } else if (f.type === 'upsell') {
        // Try AI-generated upsell
        try {
          const settings = (await db.query(`SELECT key, value FROM settings`)).rows;
          const biz = settings.find(s => s.key === 'business_name')?.value || 'our business';
          const services = (await db.query(`SELECT name, price_pkr FROM services WHERE is_active=true LIMIT 5`)).rows;
          const result = await generateAIResponse({
            systemPrompt: `You are a sales assistant for ${biz}. Write a short, friendly WhatsApp upsell message (2 sentences max). No markdown.`,
            conversationHistory: [],
            userMessage: `Suggest a follow-up upsell to client ${name} from: ${services.map(s => `${s.name} (PKR ${s.price_pkr})`).join(', ')}`,
          });
          message = result.response || `Hi ${name}! 🚀 We have more amazing services — reply to see what's available! 😊`;
        } catch {
          message = `Hi ${name}! 🚀 We have more services you might love. Reply to see what's available! 😊`;
        }
      }
    }

    await sendText(f.whatsapp_number, message, f.client_id);
    await db.query(`UPDATE follow_ups SET status='sent', sent_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ success: true, message });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`UPDATE follow_ups SET status='skipped' WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

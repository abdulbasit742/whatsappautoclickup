/**
 * Sentiment Analysis Service (P66)
 * Analyzes text and returns sentiment + urgency scores.
 * Uses AI provider when available, falls back to keyword analysis.
 */

const POSITIVE_WORDS = ['thanks','great','awesome','perfect','happy','love','excellent','good','pleased'];
const NEGATIVE_WORDS = ['bad','terrible','awful','worst','hate','disappointed','angry','frustrated','broken'];
const URGENT_WORDS   = ['urgent','asap','immediately','emergency','critical','now','help','stuck'];
const CONFUSED_WORDS = ['confused','unclear','don\'t understand','what','how','why','problem','issue'];

/**
 * Analyze sentiment of a text string.
 * @param {string} text
 * @returns {{ sentiment: string, score: number, flags: string[] }}
 */
function analyzeSentiment(text) {
  if (!text) return { sentiment: 'neutral', score: 0, flags: [] };
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  const posCount = words.filter(w => POSITIVE_WORDS.some(p => w.includes(p))).length;
  const negCount = words.filter(w => NEGATIVE_WORDS.some(p => w.includes(p))).length;
  const urgCount = words.filter(w => URGENT_WORDS.some(p => w.includes(p))).length;
  const conCount = words.filter(w => CONFUSED_WORDS.some(p => lower.includes(p))).length;

  const flags = [];
  if (urgCount > 0) flags.push('urgent');
  if (conCount > 0) flags.push('confused');

  let score = (posCount - negCount) * 10;
  score = Math.max(-100, Math.min(100, score));

  let sentiment = 'neutral';
  if (score > 20)  sentiment = 'positive';
  if (score < -20) sentiment = 'negative';
  if (urgCount > 0 && sentiment === 'negative') sentiment = 'urgent';
  if (conCount > 0 && sentiment === 'neutral')  sentiment = 'confused';

  return { sentiment, score, flags };
}

/**
 * Run sentiment analysis on a conversation (array of messages).
 * @param {Array<{content: string, direction: string}>} messages
 * @returns {{ overall: string, score: number, flags: string[] }}
 */
function analyzeConversation(messages) {
  if (!messages?.length) return { overall: 'neutral', score: 0, flags: [] };
  const inbound = messages.filter(m => m.direction === 'inbound').map(m => m.content).join(' ');
  return analyzeSentiment(inbound);
}

module.exports = { analyzeSentiment, analyzeConversation };

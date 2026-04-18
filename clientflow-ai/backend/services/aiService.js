// Re-export from the new modular AI service.
// This shim keeps existing imports (webhook route, etc.) working without modification.
module.exports = require('../modules/ai/aiService');

/**
 * Saboot Open-Source AI Service (Compatibility Wrapper)
 * Re-exports the dedicated AI Explanation Service
 */

const aiExplanationService = require('./aiExplanationService');

module.exports = {
  ...aiExplanationService,
};

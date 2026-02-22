const MODEL = process.env.VENICE_API_KEY 
  ? "zai-org-glm-5"
  : "anthropic/claude-sonnet-4-20250514";

const PROVIDER = process.env.VENICE_API_KEY
  ? "venice"
  : "openrouter";

const API_URL = PROVIDER === "venice"
  ? "https://api.venice.ai/api/v1/chat/completions"
  : "https://openrouter.ai/api/v1/chat/completions";

const API_KEY = process.env.VENICE_API_KEY || process.env.OPENROUTER_API_KEY;

module.exports = { MODEL, PROVIDER, API_URL, API_KEY };

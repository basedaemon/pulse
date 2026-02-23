const MODEL = "z-ai/glm-5";
const PROVIDER = "openrouter";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;
module.exports = { MODEL, PROVIDER, API_URL, API_KEY };
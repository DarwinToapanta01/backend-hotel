import 'dotenv/config';
import OpenAI from 'openai';

export const xaiClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1", // Redirige a xAI
});

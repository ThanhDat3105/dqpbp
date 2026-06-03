"use strict";

const axios = require("axios");
const {
  BadRequestError,
  InternalServerError,
} = require("../core/error.response");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_KB_CHARS = Number(process.env.KNOWLEDGE_BASE_MAX_CHARS) || 80_000;

function buildSystemPrompt(knowledgeContent) {
  const base =
    "You are a helpful assistant for the ward management system. Answer using the knowledge base below. If the answer is not in the knowledge base, say you do not have that information and suggest contacting staff.";

  if (!knowledgeContent?.trim()) {
    return `${base}\n\n(No knowledge base documents loaded yet.)`;
  }

  const truncated =
    knowledgeContent.length > MAX_KB_CHARS
      ? `${knowledgeContent.slice(0, MAX_KB_CHARS)}\n\n[... truncated ...]`
      : knowledgeContent;

  return `${base}\n\n## Knowledge base\n\n${truncated}`;
}

async function chat({ message, knowledgeContent }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new BadRequestError("OPENAI_API_KEY is not configured");
  }

  try {
    const { data } = await axios.post(
      OPENAI_API_URL,
      {
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(knowledgeContent) },
          { role: "user", content: message },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      },
    );

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new InternalServerError("Empty response from OpenAI");
    }

    return {
      reply,
      model: data.model,
      usage: data.usage,
    };
  } catch (error) {
    const openAiMessage = error.response?.data?.error?.message || error.message;

    if (error.response?.status === 401) {
      throw new BadRequestError("Invalid OpenAI API key");
    }

    throw new InternalServerError(`OpenAI request failed: ${openAiMessage}`);
  }
}

module.exports = {
  chat,
  buildSystemPrompt,
};

"use strict";

const axios = require("axios");
const {
  BadRequestError,
  InternalServerError,
} = require("../core/error.response");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_KB_CHARS = Number(process.env.KNOWLEDGE_BASE_MAX_CHARS) || 80_000;
const KB_MISS_SENTINEL = "__KB_MISS__";

function truncateKnowledge(knowledgeContent) {
  if (!knowledgeContent?.trim()) return null;

  return knowledgeContent.length > MAX_KB_CHARS
    ? `${knowledgeContent.slice(0, MAX_KB_CHARS)}\n\n[... truncated ...]`
    : knowledgeContent;
}

function buildSystemPrompt(knowledgeContent, mode = "knowledge_base") {
  if (mode === "general") {
    return (
      "You are a helpful assistant for the ward management system. " +
      "Answer the user's question using your general knowledge. " +
      "If the question is specific to this ward's internal procedures and you are unsure, suggest contacting ward staff."
    );
  }

  const truncated = truncateKnowledge(knowledgeContent);
  const base =
    "You are a helpful assistant for the ward management system. " +
    `Answer using ONLY the knowledge base below. If the answer is not in the knowledge base, respond with exactly: ${KB_MISS_SENTINEL} (nothing else).`;

  if (!truncated) {
    return `${base}\n\n(No knowledge base documents loaded yet.)`;
  }

  return `${base}\n\n## Knowledge base\n\n${truncated}`;
}

function isKbMiss(reply) {
  return reply?.trim() === KB_MISS_SENTINEL;
}

function mergeUsage(a, b) {
  if (!a) return b;
  if (!b) return a;

  return {
    prompt_tokens: (a.prompt_tokens || 0) + (b.prompt_tokens || 0),
    completion_tokens: (a.completion_tokens || 0) + (b.completion_tokens || 0),
    total_tokens: (a.total_tokens || 0) + (b.total_tokens || 0),
  };
}

async function callOpenAi(apiKey, messages) {
  const { data } = await axios.post(
    OPENAI_API_URL,
    { model: DEFAULT_MODEL, messages },
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

  return { reply, model: data.model, usage: data.usage };
}

async function chat({ message, knowledgeContent }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new BadRequestError("OPENAI_API_KEY is not configured");
  }

  try {
    // const kbResult = await callOpenAi(apiKey, [
    //   { role: "system", content: buildSystemPrompt(knowledgeContent) },
    //   { role: "user", content: message },
    // ]);

    // if (!isKbMiss(kbResult.reply)) {
    //   return {
    //     ...kbResult,
    //     source: "knowledge_base",
    //     rounds: 1,
    //   };
    // }

    const generalResult = await callOpenAi(apiKey, [
      { role: "system", content: buildSystemPrompt(null, "general") },
      { role: "user", content: message },
    ]);

    return {
      reply: generalResult.reply,
      model: generalResult.model,
      usage: generalResult.usage,
      source: "general",
      rounds: 2,
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

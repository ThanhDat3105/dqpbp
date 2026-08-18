"use strict";

const { SuccessResponse } = require("../core/success.response");
const knowledgeBaseService = require("../services/knowledge-base.service");
const chatgptService = require("../services/chatgpt.service");
const { getRelevantText } = require("../utils/ai/query");

const chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    const { content } = await knowledgeBaseService.loadKnowledgeBase();

    const result = await chatgptService.chat({
      message,
      knowledgeContent: content,
    });

    return new SuccessResponse({
      message: "Chat response generated",
      metaData: {
        reply: result.reply,
        model: result.model,
        usage: result.usage,
        source: result.source,
        rounds: result.rounds,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const chatV2 = async (req, res, next) => {
  try {
    const { message } = req.body;
    const { content, sources, chunkIds } = await getRelevantText(message);

    const result = await chatgptService.chat({
      message,
      knowledgeContent: content || undefined,
    });

    return new SuccessResponse({
      message: "Chat response generated",
      metaData: {
        reply: result.reply,
        model: result.model,
        usage: result.usage,
        source: result.source,
        rounds: result.rounds,
        sources,
        chunkIds,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};
module.exports = {
  chat,
  chatV2,
};

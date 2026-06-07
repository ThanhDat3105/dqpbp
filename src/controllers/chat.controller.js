"use strict";

const { SuccessResponse } = require("../core/success.response");
const knowledgeBaseService = require("../services/knowledge-base.service");
const chatgptService = require("../services/chatgpt.service");

const chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    console.log(message);
    const { content, files, sources } =
      await knowledgeBaseService.loadKnowledgeBase();

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
        knowledge_files: files,
        knowledge_sources: sources,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  chat,
};

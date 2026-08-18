"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const activityTemplateService = require("../services/activity-template.service");

const getTemplates = async (req, res, next) => {
  try {
    const data = await activityTemplateService.getTemplates(req.query);
    return new SuccessResponse({
      message: "Activity templates retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const getTemplateById = async (req, res, next) => {
  try {
    const data = await activityTemplateService.getTemplateById(req.params.id);
    return new SuccessResponse({
      message: "Activity template retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const data = await activityTemplateService.createTemplate(
      req.body,
      req.user.user_id,
    );
    return new CREATED({
      message: "Activity template created successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const data = await activityTemplateService.updateTemplate(
      req.params.id,
      req.body,
    );
    return new SuccessResponse({
      message: "Activity template updated successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    await activityTemplateService.deleteTemplate(req.params.id);
    return new SuccessResponse({
      message: "Activity template deleted successfully",
      metaData: { id: Number(req.params.id) },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const createActivityFromTemplate = async (req, res, next) => {
  try {
    const data = await activityTemplateService.createActivityFromTemplate(
      req.params.id,
      req.body,
      req.user.user_id,
      req.user.role,
    );
    return new CREATED({
      message: "Activity created from template successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const createTemplateFromActivity = async (req, res, next) => {
  try {
    const data = await activityTemplateService.createTemplateFromActivity(
      req.params.activityId,
      req.body,
      req.user.user_id,
    );
    return new CREATED({
      message: "Activity template created from activity successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createActivityFromTemplate,
  createTemplateFromActivity,
};

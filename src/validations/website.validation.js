"use strict";

const Joi = require("joi");

const ARTICLE_CATEGORIES = [
  "hoat-dong",
  "tin-tuc",
  "thong-bao",
  "van-ban-phap-quy",
];
const DOCUMENT_CATEGORIES = [
  "nhiem-vu",
  "hanh-chinh",
  "tuyen-truyen",
  "bao-mat",
  "hau-can",
];
const DOCUMENT_STATUSES = ["active", "expired", "new"];

const idParam = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
};

const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

const boolQuery = Joi.boolean().truthy("true").falsy("false");

const publicArticles = {
  query: Joi.object().keys({
    category: Joi.string().valid(...ARTICLE_CATEGORIES).optional(),
    featured: boolQuery.optional(),
    ...paginationQuery,
  }),
};

const adminArticles = {
  query: Joi.object().keys({
    keyword: Joi.string().max(200).allow("", null).optional(),
    category: Joi.string().valid(...ARTICLE_CATEGORIES).allow("", null).optional(),
    ...paginationQuery,
  }),
};

const createArticle = {
  body: Joi.object()
    .keys({
      title: Joi.string().min(2).max(500).required(),
      category: Joi.string().valid(...ARTICLE_CATEGORIES).required(),
      content: Joi.string().allow("", null).optional(),
      thumbnail_url: Joi.string().max(500).allow("", null).optional(),
      display_order: Joi.number().integer().default(0),
      is_featured: Joi.boolean().default(false),
      is_visible: Joi.boolean().default(true),
    })
    .unknown(false),
};

const updateArticle = {
  ...idParam,
  body: Joi.object()
    .keys({
      title: Joi.string().min(2).max(500).optional(),
      category: Joi.string().valid(...ARTICLE_CATEGORIES).optional(),
      content: Joi.string().allow("", null).optional(),
      thumbnail_url: Joi.string().max(500).allow("", null).optional(),
      display_order: Joi.number().integer().optional(),
      is_featured: Joi.boolean().optional(),
      is_visible: Joi.boolean().optional(),
    })
    .min(1)
    .unknown(false),
};

const publicDocuments = {
  query: Joi.object().keys({
    category: Joi.string().valid(...DOCUMENT_CATEGORIES).allow("", null).optional(),
    status: Joi.string().valid(...DOCUMENT_STATUSES).allow("", null).optional(),
    year: Joi.number().integer().min(1900).max(3000).optional(),
    keyword: Joi.string().max(200).allow("", null).optional(),
    ...paginationQuery,
  }),
};

const adminDocuments = {
  query: Joi.object().keys({
    keyword: Joi.string().max(200).allow("", null).optional(),
    category: Joi.string().valid(...DOCUMENT_CATEGORIES).allow("", null).optional(),
    status: Joi.string().valid(...DOCUMENT_STATUSES).allow("", null).optional(),
    ...paginationQuery,
  }),
};

const createDocument = {
  body: Joi.object()
    .keys({
      title: Joi.string().min(2).max(500).required(),
      doc_number: Joi.string().max(100).allow("", null).optional(),
      issued_by: Joi.string().max(200).allow("", null).optional(),
      issued_date: Joi.date().allow(null).optional(),
      category: Joi.string().valid(...DOCUMENT_CATEGORIES).required(),
      file_url: Joi.string().max(500).allow("", null).optional(),
      file_size: Joi.string().max(50).allow("", null).optional(),
      status: Joi.string().valid(...DOCUMENT_STATUSES).default("active"),
      display_order: Joi.number().integer().default(0),
      is_visible: Joi.boolean().default(true),
    })
    .unknown(false),
};

const updateDocument = {
  ...idParam,
  body: Joi.object()
    .keys({
      title: Joi.string().min(2).max(500).optional(),
      doc_number: Joi.string().max(100).allow("", null).optional(),
      issued_by: Joi.string().max(200).allow("", null).optional(),
      issued_date: Joi.date().allow(null).optional(),
      category: Joi.string().valid(...DOCUMENT_CATEGORIES).optional(),
      file_url: Joi.string().max(500).allow("", null).optional(),
      file_size: Joi.string().max(50).allow("", null).optional(),
      status: Joi.string().valid(...DOCUMENT_STATUSES).optional(),
      display_order: Joi.number().integer().optional(),
      is_visible: Joi.boolean().optional(),
    })
    .min(1)
    .unknown(false),
};

const publicSlides = {
  query: Joi.object().keys({
    featured: boolQuery.optional(),
  }),
};

const adminSlides = {
  query: Joi.object().keys({
    ...paginationQuery,
  }),
};

const createSlide = {
  body: Joi.object()
    .keys({
      name: Joi.string().min(2).max(300).required(),
      image_url: Joi.string().max(500).allow("", null).optional(),
      display_order: Joi.number().integer().default(0),
      is_featured: Joi.boolean().default(false),
      is_visible: Joi.boolean().default(true),
    })
    .unknown(false),
};

const updateSlide = {
  ...idParam,
  body: Joi.object()
    .keys({
      name: Joi.string().min(2).max(300).optional(),
      image_url: Joi.string().max(500).allow("", null).optional(),
      display_order: Joi.number().integer().optional(),
      is_featured: Joi.boolean().optional(),
      is_visible: Joi.boolean().optional(),
    })
    .min(1)
    .unknown(false),
};

const createContact = {
  body: Joi.object()
    .keys({
      full_name: Joi.string().min(2).max(200).required(),
      phone: Joi.string()
        .pattern(/^0\d{9}$/)
        .required()
        .messages({ "string.pattern.base": "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0" }),
      email: Joi.string().email().max(200).allow("", null).optional(),
      subject: Joi.string().max(100).allow("", null).optional(),
      message: Joi.string().min(10).required(),
    })
    .unknown(false),
};

const adminContacts = {
  query: Joi.object().keys({
    is_read: boolQuery.optional(),
    ...paginationQuery,
  }),
};

module.exports = {
  idParam,
  publicArticles,
  adminArticles,
  createArticle,
  updateArticle,
  publicDocuments,
  adminDocuments,
  createDocument,
  updateDocument,
  publicSlides,
  adminSlides,
  createSlide,
  updateSlide,
  createContact,
  adminContacts,
};

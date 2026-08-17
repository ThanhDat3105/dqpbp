"use strict";

const Joi = require("joi");

const optionalText = (max = 100) =>
  Joi.alternatives()
    .try(Joi.string().max(max), Joi.number())
    .optional()
    .allow("", null)
    .custom((value) => (value == null || value === "" ? value : String(value)));

const optionalLat = () =>
  Joi.number().min(-90).max(90).optional().allow(null).messages({
    "number.min": "latitude phải trong khoảng -90 đến 90",
    "number.max": "latitude phải trong khoảng -90 đến 90",
  });

const optionalLng = () =>
  Joi.number().min(-180).max(180).optional().allow(null).messages({
    "number.min": "longitude phải trong khoảng -180 đến 180",
    "number.max": "longitude phải trong khoảng -180 đến 180",
  });

const optionalAddressCoords = {
  permanent_address_lat: optionalLat(),
  permanent_address_lng: optionalLng(),
  temporary_address_lat: optionalLat(),
  temporary_address_lng: optionalLng(),
};

module.exports = {
  optionalText,
  optionalLat,
  optionalLng,
  optionalAddressCoords,
};

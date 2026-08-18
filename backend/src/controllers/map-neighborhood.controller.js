"use strict";

const mapNeighborhoodService = require("../services/map-neighborhood.service");

const getKhuPho = async (req, res, next) => {
  try {
    const metaData = await mapNeighborhoodService.fetchNeighborhoodGeoJson({
      role: req.user.role,
      user_id: req.user.user_id,
    });

    return res.status(200).json({
      status: true,
      metaData,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getKhuPho,
};

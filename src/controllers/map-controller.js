"use strict";

const mapService = require("../services/map.service");

const getNhanSu = async (req, res, next) => {
  try {
    const { type, neighborhood } = req.query;

    const metaData = await mapService.fetchMapPersonnel(
      {
        role: req.user.role,
        user_id: req.user.user_id,
      },
      {
        type: type ?? null,
        neighborhood: neighborhood ?? null,
      },
    );

    return res.status(200).json({
      status: true,
      metaData,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getNhanSu,
};

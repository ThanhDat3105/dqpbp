"use strict";

const mapService = require("../services/map.service");

const getNhanSu = async (req, res, next) => {
  try {
    const { loai, khu_pho } = req.query;

    const metaData = await mapService.fetchMapPersonnel(
      {
        role: req.user.role,
        user_id: req.user.user_id,
      },
      {
        loai: loai ?? null,
        khu_pho: khu_pho ?? null,
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

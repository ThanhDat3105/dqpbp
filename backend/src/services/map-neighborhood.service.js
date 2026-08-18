"use strict";

const fs = require("fs/promises");
const path = require("path");

const db = require("../config/db");
const {
  ForbiddenError,
  InternalServerError,
} = require("../core/error.response");

const GEOJSON_PATH = path.join(__dirname, "../data/neighborhoods.geojson");
const FULL_ACCESS_ROLES = new Set(["ADMIN", "CHI_HUY", "TO_TRUONG"]);
const ALLOWED_ROLES = new Set([...FULL_ACCESS_ROLES, "DQTT"]);
const STYLE_URL_PATTERN = /^#poly-([0-9a-f]{6})-/i;

let normalizedGeoJsonPromise = null;

const stripVietnameseMarks = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .trim();

const normalizeNeighborhoodCode = (value) => {
  const normalized = stripVietnameseMarks(value).toUpperCase();
  const patterns = [
    /^KP\s*0*(\d{1,2})$/,
    /^KHU\s*PHO\s*0*(\d{1,2})$/,
    /^0*(\d{1,2})$/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const number = Number(match[1]);
    if (number >= 1 && number <= 16) {
      return `KP${String(number).padStart(2, "0")}`;
    }
  }

  return null;
};

const getFillColor = (styleUrl) => {
  const match = String(styleUrl ?? "").match(STYLE_URL_PATTERN);
  return match ? `#${match[1].toUpperCase()}` : "#6B8E23";
};

const normalizeFeature = (feature) => {
  if (feature?.type !== "Feature" || feature?.geometry?.type !== "Polygon") {
    throw new InternalServerError("Dữ liệu ranh giới Khu phố không hợp lệ");
  }

  const name = String(feature.properties?.name ?? "").trim();
  const neighborhoodCode = normalizeNeighborhoodCode(name);
  const kind = neighborhoodCode ? "neighborhood" : "ward";
  const fillColor = getFillColor(feature.properties?.styleUrl);

  return {
    type: "Feature",
    properties: {
      code: neighborhoodCode ?? "WARD",
      name,
      kind,
      fillColor,
      borderColor: fillColor,
      canToggle: kind === "neighborhood",
    },
    // Keep the source coordinate arrays unchanged.
    geometry: feature.geometry,
  };
};

const validateNormalizedFeatures = (features) => {
  const neighborhoodCodes = features
    .filter((feature) => feature.properties.kind === "neighborhood")
    .map((feature) => feature.properties.code);
  const uniqueCodes = new Set(neighborhoodCodes);
  const wardCount = features.filter(
    (feature) => feature.properties.kind === "ward",
  ).length;

  if (
    neighborhoodCodes.length !== 16 ||
    uniqueCodes.size !== 16 ||
    wardCount !== 1
  ) {
    throw new InternalServerError(
      "Dữ liệu ranh giới phải gồm một phường và 16 Khu phố",
    );
  }
};

const loadNormalizedGeoJson = async () => {
  if (!normalizedGeoJsonPromise) {
    normalizedGeoJsonPromise = fs
      .readFile(GEOJSON_PATH, "utf8")
      .then((raw) => JSON.parse(raw))
      .then((geoJson) => {
        if (geoJson?.type !== "FeatureCollection" || !Array.isArray(geoJson.features)) {
          throw new InternalServerError("GeoJSON Khu phố không phải FeatureCollection");
        }

        const features = geoJson.features.map(normalizeFeature);
        validateNormalizedFeatures(features);

        return {
          type: "FeatureCollection",
          features,
        };
      })
      .catch((error) => {
        normalizedGeoJsonPromise = null;
        if (error instanceof InternalServerError) throw error;
        throw new InternalServerError("Không thể tải dữ liệu ranh giới Khu phố");
      });
  }

  return normalizedGeoJsonPromise;
};

const getDqttNeighborhoodCodes = async (userId) => {
  const { rows } = await db.query(
    "SELECT managed_units FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  const managedUnits = rows[0]?.managed_units;

  if (!Array.isArray(managedUnits) || managedUnits.length === 0) {
    throw new ForbiddenError("DQTT không có khu phố phụ trách");
  }

  const codes = new Set(
    managedUnits.map(normalizeNeighborhoodCode).filter(Boolean),
  );

  if (codes.size === 0) {
    throw new ForbiddenError("DQTT không có khu phố phụ trách");
  }

  return codes;
};

const fetchNeighborhoodGeoJson = async ({ role, user_id: userId }) => {
  if (!ALLOWED_ROLES.has(role)) {
    throw new ForbiddenError("Không có quyền truy cập module bản đồ");
  }

  const geoJson = await loadNormalizedGeoJson();
  if (FULL_ACCESS_ROLES.has(role)) return geoJson;

  const allowedCodes = await getDqttNeighborhoodCodes(userId);
  return {
    type: "FeatureCollection",
    features: geoJson.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        canToggle:
          feature.properties.kind === "neighborhood" &&
          allowedCodes.has(feature.properties.code),
      },
    })),
  };
};

module.exports = {
  fetchNeighborhoodGeoJson,
};

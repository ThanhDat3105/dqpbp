const paginate = async ({
  pool,
  table,
  filter = {},
  search = null,
  searchFields = [],
  sortBy = "created_at",
  order = "DESC",
  rawOrderBy = null,   // overrides sortBy/order when provided
  page = 1,
  limit = 10,
  select = "*",
}) => {
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let values = [];
  let index = 1;

  // FILTER
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key.endsWith("_from")) {
        // field >= value  (inclusive lower bound)
        const field = key.replace("_from", "");
        whereClauses.push(`${field} >= $${index}`);
      } else if (key.endsWith("_lte")) {
        // field <= value  (inclusive upper bound)
        const field = key.replace("_lte", "");
        whereClauses.push(`${field} <= $${index}`);
      } else if (key.endsWith("_to")) {
        // field < value   (exclusive upper bound — legacy)
        const field = key.replace("_to", "");
        whereClauses.push(`${field} < $${index}`);
      } else {
        whereClauses.push(`${key} = $${index}`);
      }

      values.push(value);
      index++;
    }
  });

  // SEARCH
  if (search && searchFields.length > 0) {
    const searchConditions = searchFields.map((field) => {
      values.push(`%${search}%`);
      return `${field} ILIKE $${values.length}`;
    });

    whereClauses.push(`(${searchConditions.join(" OR ")})`);
  }

  const whereSQL = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  // COUNT QUERY
  const countQuery = `
    SELECT COUNT(*) 
    FROM ${table}
    ${whereSQL}
  `;

  const countResult = await pool.query(countQuery, values);
  const totalResults = parseInt(countResult.rows[0].count);

  // DATA QUERY
  const orderBySQL = rawOrderBy ?? `${sortBy} ${order}`;
  const dataQuery = `
    SELECT ${select}
    FROM ${table}
    ${whereSQL}
    ORDER BY ${orderBySQL}
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const dataValues = [...values, limit, offset];

  const result = await pool.query(dataQuery, dataValues);

  const totalPages = Math.ceil(totalResults / limit);

  return {
    results: result.rows,
    page,
    limit,
    totalPages,
    totalResults,
  };
};

module.exports = paginate;

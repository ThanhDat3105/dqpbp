const service = require('../services/schedules.service');

const getWeek = async (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart)
    return res.status(400).json({ error: 'weekStart required (YYYY-MM-DD)' });
  const data = await service.getWeek(weekStart);
  res.json(data);
}

const upsertWeek = async (req, res) => {
  const { rows, officeColumns } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'rows[] required' });
  const userId = req.user && req.user.user_id ? req.user.user_id : (req.user?.id);
  const result = await service.upsertWeek(rows, officeColumns ?? [], userId);
  res.json(result);
}

module.exports = { getWeek, upsertWeek };

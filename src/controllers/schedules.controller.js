// controllers/scheduleController.js
const schedulesService = require('../services/schedules.service');

// GET /api/schedule?date=2025-07-14
const getWeek = async (req, res) => {
  try {
    const data = await schedulesService.getWeekByDate(req.query.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/schedule/week
// body: { target: 'next' | 'current' | 'YYYY-MM-DD' }
const createWeek = async (req, res) => {
  try {
    const { target = 'next' } = req.body;
    const userId = req.user?.id ?? null;
    const data = await schedulesService.createWeek(target, userId);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/schedule/day/:date
// params: date = 'YYYY-MM-DD'
// body: { commander, duty_officer, ... }
const updateDay = async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date phải có định dạng YYYY-MM-DD' });
    }

    const userId = req.user?.id ?? null;
    const data = await schedulesService.updateDay(date, req.body, userId);
    res.json(data);
  } catch (err) {
    const status = err.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
};

module.exports = { getWeek, createWeek, updateDay };
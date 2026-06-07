'use strict';

const departmentService = require('../services/department.service');

const getAll = async (req, res) => {
    try {
        const { search } = req.query;
        const data = await departmentService.getAll({ search });
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getById = async (req, res) => {
    try {
        const data = await departmentService.getById(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Department not found' });
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const create = async (req, res) => {
    try {
        let { code, name } = req.body;

        code = code ? code.trim().toLowerCase() : '';
        name = name ? name.trim() : '';

        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Code and name are required' });
        }

        if (!/^[a-z_]+$/.test(code) || code.length > 50) {
            return res.status(400).json({ success: false, message: 'Invalid code format' });
        }

        const data = await departmentService.create({ code, name });
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'Code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const update = async (req, res) => {
    try {
        let { name } = req.body;

        name = name ? name.trim() : '';

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const id = req.params.id;

        const existing = await departmentService.getById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Department not found' });

        const data = await departmentService.update(id, { name });
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const remove = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await departmentService.getById(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Department not found' });

        const userCount = await departmentService.countUsersByDepartmentId(id);
        if (userCount > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete department with existing members' });
        }

        const data = await departmentService.remove(id);
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};

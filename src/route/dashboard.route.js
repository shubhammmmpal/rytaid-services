// routes/dashboard.js
import express from "express";
const router = express.Router();

// const Job = require('../models/Job'); 
import Job from '../model/job.model.js' 
    // adjust path if needed
import Site  from'../model/site.model.js';
import Member  from'../model/member.model.js';
import {Client}  from'../model/client.model.js';

// Helper → last N days range
function getDateRange(days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start, end };
}

// ───────────────────────────────────────────────
//  JOBS PANEL
// ───────────────────────────────────────────────

// GET /api/dashboard/jobs/overview?days=30&clientId=...
router.get('/jobs/overview', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const clientId = req.query.clientId;

    const { start, end } = getDateRange(days);
    const match = { startDate: { $gte: start, $lte: end } };
    if (clientId) match.client = clientId;

    const [total, byStatus, thisPeriod] = await Promise.all([
      Job.countDocuments({}),
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Job.countDocuments(match)
    ]);

    // Very naive previous period
    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - days);
    const prevCount = await Job.countDocuments({
      startDate: { $gte: prevStart, $lte: start },
      ...(clientId && { client: clientId })
    });

    const growth = prevCount === 0 ? 0 : ((thisPeriod - prevCount) / prevCount) * 100;

    const statusMap = {};
    byStatus.forEach(s => statusMap[s._id] = s.count);

    res.json({
      totalJobs: total,
      pending: statusMap.pending || 0,
      approved: statusMap.approved || 0,
      rejected: statusMap.rejected || 0,
      thisPeriod,
      previousPeriod: prevCount,
      growthPercent: Math.round(growth * 10) / 10
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/jobs/recent?limit=8&status=approved&clientId=...
router.get('/jobs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.clientId) query.client = req.query.clientId;

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('client', 'companyInfo.companyName individualInfo.firstName individualInfo.lastName')
      .populate('assignedTo', 'firstName lastName profileImg')
      .lean();

    // optional: flatten client name
    const formatted = jobs.map(j => ({
      ...j,
      clientName: j.client?.companyInfo?.companyName || `${j.client?.individualInfo?.firstName || ''} ${j.client?.individualInfo?.lastName || ''}`.trim(),
      siteNames: j.site_id ? j.site_id.map(s => s.site_name || 'Unknown') : [] // if you populate site_id later
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
//  SITES PANEL  (very similar)
// ───────────────────────────────────────────────

router.get('/sites/overview', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const clientId = req.query.clientId;

    const { start, end } = getDateRange(days);
    const match = { createdAt: { $gte: start, $lte: end } }; // or use another date field
    if (clientId) match.client_id = clientId; // note: your site has client_id as array

    const [total, byStatus, thisPeriod] = await Promise.all([
      Site.countDocuments({}),
      Site.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Site.countDocuments(match)
    ]);

    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - days);
    const prevCount = await Site.countDocuments({
      createdAt: { $gte: prevStart, $lte: start },
      ...(clientId && { client_id: clientId })
    });

    const growth = prevCount === 0 ? 0 : ((thisPeriod - prevCount) / prevCount) * 100;

    const statusMap = {};
    byStatus.forEach(s => statusMap[s._id] = s.count);

    res.json({
      totalSites: total,
      pending: statusMap.pending || 0,
      approved: statusMap.approved || 0,
      rejected: statusMap.rejected || 0,
      thisPeriod,
      growthPercent: Math.round(growth * 10) / 10
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sites/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const query = {};
    if (req.query.status) query.status = req.query.status;

    const sites = await Site.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('client_id', 'companyInfo.companyName individualInfo.firstName individualInfo.lastName')
      .populate('assignedTo', 'firstName lastName')
      .lean();

    const formatted = sites.map(s => ({
      ...s,
      clientNames: s.client_id?.map(c => c.companyInfo?.companyName || c.individualInfo?.firstName || '') || [],
      memberCount: s.assignedTo?.length || 0
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
//  TEAM ACTIVITY PANEL  (simplest version first)
// ───────────────────────────────────────────────

router.get('/team/overview', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeToday, punchInsToday] = await Promise.all([
      // Members who punched in today (very approximate)
      Job.distinct('assignedTo', { punchIn: { $gte: todayStart } }).then(ids => ids.length),
      // Count punch-ins today
      Job.countDocuments({ punchIn: { $gte: todayStart } })
    ]);

    // Very basic activity count this period
    const { start } = getDateRange(days);
    const activityThisPeriod = await Job.countDocuments({ createdAt: { $gte: start } });

    res.json({
      activeMembersToday: activeToday,
      punchInsToday,
      hoursToday: 0,                // ← todo: calculate real hours later
      activityThisPeriod,
      // topMembers: []             // add later if needed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getLastNDays(days = 30) {
  const dates = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
  }
  return dates;
}

// ───────────────────────────────────────────────
// JOBS – day wise creation count
// GET /api/dashboard/jobs/daily?days=30
// ───────────────────────────────────────────────
router.get('/jobs/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const result = await Job.aggregate(pipeline);

    // Fill missing days with 0
    const dateMap = new Map(result.map(item => [item._id, item.count]));
    const lastDays = getLastNDays(days);
    const chartData = lastDays.map(date => ({
      date,
      jobsCreated: dateMap.get(date) || 0
    }));

    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// SITES – day wise creation count
// GET /api/dashboard/sites/daily?days=30
// ───────────────────────────────────────────────
router.get('/sites/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const result = await Site.aggregate(pipeline);

    const dateMap = new Map(result.map(item => [item._id, item.count]));
    const lastDays = getLastNDays(days);
    const chartData = lastDays.map(date => ({
      date,
      sitesCreated: dateMap.get(date) || 0
    }));

    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// TEAM ACTIVITY – day wise job creations (as proxy for activity)
// GET /api/dashboard/team/daily?days=7
// ───────────────────────────────────────────────
router.get('/team/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const result = await Job.aggregate(pipeline); // using Job creations as activity proxy

    const dateMap = new Map(result.map(item => [item._id, item.count]));
    const lastDays = getLastNDays(days);
    const chartData = lastDays.map(date => ({
      date,
      activity: dateMap.get(date) || 0
    }));

    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
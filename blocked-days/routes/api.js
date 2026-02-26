const express = require('express');
const ShopifyService = require('../services/ShopifyService');
const SettingsService = require('../services/SettingsService');

const router = express.Router();

// Middleware: Require user or admin role
function requireUserOrAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role === 'guest') {
    return res.status(403).json({ error: 'Unauthorized: Guests cannot access this resource.' });
  }
  next();
}

// Middleware: Require admin role
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required.' });
  }
  next();
}

/**
 * Get current blocked dates
 */
router.get('/dates', requireUserOrAdmin, async (req, res) => {
  try {
    const dates = await ShopifyService.getSoldOutDates();
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching dates in /api/dates:', error);
    res.status(500).json({ error: 'Failed to fetch dates', details: error.message });
  }
});

/**
 * Save new dates
 */
router.post('/dates', requireUserOrAdmin, async (req, res) => {
  const { dates } = req.body;
  if (!Array.isArray(dates)) {
    return res.status(400).json({ error: 'Dates must be an array' });
  }

  try {
    const savedDates = await ShopifyService.saveSoldOutDates(dates);
    res.json({ success: true, savedDates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save dates' });
  }
});

/**
 * Admin: Get Settings
 */
router.get('/admin/settings', requireAdmin, async (req, res) => {
  try {
    const enabled = await SettingsService.isRegistrationEnabled();
    res.json({ registration_enabled: enabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * Admin: Toggle Registration
 */
router.post('/admin/settings/registration', requireAdmin, async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Invalid value' });
  }

  try {
    await SettingsService.setRegistrationEnabled(enabled);
    res.json({ success: true, registration_enabled: enabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;

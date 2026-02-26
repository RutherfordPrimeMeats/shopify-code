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

const UserService = require('../services/UserService');

/**
 * Admin: Get Users
 */
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Admin: Update User Role
 */
router.put('/admin/users/:userId/role', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['guest', 'user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Prevent removing your own admin rights just to be safe (optional but good idea)
    if (userId === req.session.user.id && role !== 'admin') {
      return res.status(403).json({ error: 'Cannot demote yourself' });
    }

    await UserService.updateUserRole(userId, role);
    res.json({ success: true, newRole: role });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * Admin: Delete User
 */
router.delete('/admin/users/:userId', requireAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    // Prevent deleting your own account
    if (userId === req.session.user.id) {
      return res.status(403).json({ error: 'Cannot delete yourself' });
    }

    await UserService.deleteUser(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
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

const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const { encryptObject, decryptObject } = require('../utils/encryption');

const router = express.Router();

// All wearable routes require authentication
router.use(authMiddleware);

// POST /api/wearable/sync — sync wearable data (encrypted at rest)
router.post('/sync', [
  body('deviceType').trim().isLength({ min: 1, max: 100 }).withMessage('Device type is required'),
  body('data').isObject().withMessage('Wearable data must be an object'),
  body('data.heartRate').optional().isFloat({ min: 0, max: 300 }),
  body('data.steps').optional().isInt({ min: 0 }),
  body('data.calories').optional().isFloat({ min: 0 }),
  body('data.sleepHours').optional().isFloat({ min: 0, max: 24 }),
  body('data.bloodOxygen').optional().isFloat({ min: 0, max: 100 }),
  body('data.temperature').optional().isFloat({ min: 30, max: 45 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { deviceType, data } = req.body;

    // Add metadata
    const syncEntry = {
      deviceType,
      data,
      syncedAt: new Date().toISOString()
    };

    // Get existing wearable data or start fresh
    let wearableHistory = [];
    if (user.encryptedWearableData) {
      try {
        wearableHistory = decryptObject(user.encryptedWearableData);
      } catch (err) {
        console.error(`Wearable decrypt warning for user ${user._id}:`, err.message);
        // If decryption fails, start fresh
      }
    }

    // Keep last 100 sync entries
    wearableHistory.push(syncEntry);
    if (wearableHistory.length > 100) {
      wearableHistory = wearableHistory.slice(-100);
    }

    user.encryptedWearableData = encryptObject(wearableHistory);
    user.lastWearableSync = new Date();
    await user.save();

    res.json({
      message: 'Wearable data synced successfully.',
      syncedAt: syncEntry.syncedAt,
      totalEntries: wearableHistory.length
    });
  } catch (err) {
    console.error('Wearable sync error:', err.message);
    res.status(500).json({ error: 'Server error during sync.' });
  }
});

// GET /api/wearable/data — get decrypted wearable history
router.get('/data', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let wearableData = [];
    if (user.encryptedWearableData) {
      try {
        wearableData = decryptObject(user.encryptedWearableData);
      } catch (err) {
        console.error(`Wearable decrypt warning for user ${user._id}:`, err.message);
        wearableData = [];
      }
    }

    res.json({
      lastSync: user.lastWearableSync,
      totalEntries: wearableData.length,
      data: wearableData
    });
  } catch (err) {
    console.error('Get wearable data error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/wearable/latest — get only the latest sync entry
router.get('/latest', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let latestEntry = null;
    if (user.encryptedWearableData) {
      try {
        const wearableData = decryptObject(user.encryptedWearableData);
        latestEntry = wearableData.length > 0 ? wearableData[wearableData.length - 1] : null;
      } catch (err) {
        console.error(`Wearable decrypt warning for user ${user._id}:`, err.message);
        latestEntry = null;
      }
    }

    res.json({
      lastSync: user.lastWearableSync,
      latest: latestEntry
    });
  } catch (err) {
    console.error('Get latest wearable error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const { encryptObject, decryptObject } = require('../utils/encryption');

const router = express.Router();

// All profile routes require authentication
router.use(authMiddleware);

// GET /api/profile — get decrypted user profile
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let profile = null;
    if (user.encryptedProfile) {
      try {
        profile = decryptObject(user.encryptedProfile);
      } catch (err) {
        console.error(`Profile decrypt warning for user ${user._id}:`, err.message);
        profile = null;
      }
    }

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      profile
    });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/profile/raw — get both encrypted and decrypted profile + wearable data
router.get('/raw', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let decryptedProfile = null;
    if (user.encryptedProfile) {
      try { decryptedProfile = decryptObject(user.encryptedProfile); } catch { /* */ }
    }

    let decryptedWearable = null;
    if (user.encryptedWearableData) {
      try { decryptedWearable = decryptObject(user.encryptedWearableData); } catch { /* */ }
    }

    res.json({
      profile: {
        encrypted: user.encryptedProfile || null,
        decrypted: decryptedProfile
      },
      wearable: {
        encrypted: user.encryptedWearableData || null,
        decrypted: decryptedWearable,
        lastSync: user.lastWearableSync
      }
    });
  } catch (err) {
    console.error('Get raw data error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/profile — update and encrypt user profile
router.put('/', [
  body('age').optional().isInt({ min: 1, max: 150 }),
  body('height').optional().isFloat({ min: 30, max: 300 }),
  body('weight').optional().isFloat({ min: 1, max: 700 }),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']),
  body('medicalConditions').optional().isArray(),
  body('emergencyContact').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Merge with existing profile data if any
    let existingProfile = {};
    if (user.encryptedProfile) {
      try {
        existingProfile = decryptObject(user.encryptedProfile);
      } catch (err) {
        console.error(`Profile decrypt warning for user ${user._id}:`, err.message);
        // If decryption fails, start fresh
      }
    }

    const allowedFields = ['age', 'height', 'weight', 'gender', 'bloodType', 'medicalConditions', 'emergencyContact', 'fitnessGoals', 'activityLevel'];
    const profileUpdate = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        profileUpdate[field] = req.body[field];
      }
    }

    const updatedProfile = { ...existingProfile, ...profileUpdate, updatedAt: new Date().toISOString() };

    user.encryptedProfile = encryptObject(updatedProfile);
    await user.save();

    res.json({ message: 'Profile updated successfully.', profile: updatedProfile });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { encryptObject, decryptObject } = require('../utils/encryption');

// Validate incoming wearable data
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Payload must be a JSON object';
  if (!payload.type) return 'Missing "type" field (heartRate or steps)';
  if (!['heartRate', 'steps'].includes(payload.type)) return 'type must be "heartRate" or "steps"';

  if (payload.type === 'heartRate') {
    if (typeof payload.value !== 'number' || payload.value < 0 || payload.value > 300) {
      return 'heartRate value must be a number between 0 and 300';
    }
  }

  if (payload.type === 'steps') {
    if (!Number.isInteger(payload.value) || payload.value < 0) {
      return 'steps value must be a non-negative integer';
    }
  }

  if (payload.deviceType && (typeof payload.deviceType !== 'string' || payload.deviceType.length > 100)) {
    return 'deviceType must be a string under 100 chars';
  }

  return null;
}

/**
 * Initialize WebSocket server on the given HTTP server.
 * Protocol: client connects to ws://host:port with token as query param or first message.
 *
 * Authentication flow:
 *   1. Connect to ws://localhost:5000?token=<JWT>
 *   2. Send JSON: { "type": "heartRate"|"steps", "value": <number>, "deviceType": "..." }
 *   3. Server validates, encrypts, stores, and ACKs back
 */
function initWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws/wearable' });

  console.log('WebSocket server ready on /ws/wearable');

  wss.on('connection', async (ws, req) => {
    // --- Authenticate via query param token ---
    let userId = null;
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Missing token. Connect with ?token=<JWT>');
        return;
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    console.log(`WS client connected: user ${userId}`);
    ws.send(JSON.stringify({ event: 'connected', message: 'Authenticated. Send heartRate/steps data.' }));

    // Throttle: max 10 messages per second per connection
    let messageCount = 0;
    const throttleInterval = setInterval(() => { messageCount = 0; }, 1000);

    ws.on('message', async (raw) => {
      messageCount++;
      if (messageCount > 10) {
        ws.send(JSON.stringify({ event: 'error', message: 'Rate limit: max 10 messages/sec' }));
        return;
      }

      let payload;
      try {
        const text = typeof raw === 'string' ? raw : raw.toString('utf8');
        payload = JSON.parse(text);
      } catch {
        ws.send(JSON.stringify({ event: 'error', message: 'Invalid JSON' }));
        return;
      }

      // Validate
      const validationError = validatePayload(payload);
      if (validationError) {
        ws.send(JSON.stringify({ event: 'error', message: validationError }));
        return;
      }

      // Build entry
      const entry = {
        type: payload.type,
        value: payload.value,
        deviceType: payload.deviceType || 'Unknown',
        timestamp: new Date().toISOString(),
        source: 'websocket'
      };

      // Encrypt and store
      try {
        const user = await User.findById(userId);
        if (!user) {
          ws.send(JSON.stringify({ event: 'error', message: 'User not found' }));
          return;
        }

        let wearableHistory = [];
        if (user.encryptedWearableData) {
          try {
            wearableHistory = decryptObject(user.encryptedWearableData);
          } catch (err) {
            console.error(`Wearable decrypt warning for user ${user._id}:`, err.message);
            // Start fresh if decryption fails
          }
        }

        wearableHistory.push({ deviceType: entry.deviceType, data: { [entry.type]: entry.value }, syncedAt: entry.timestamp, source: 'websocket' });

        // Keep last 500 entries for real-time streams (more than REST's 100)
        if (wearableHistory.length > 500) {
          wearableHistory = wearableHistory.slice(-500);
        }

        user.encryptedWearableData = encryptObject(wearableHistory);
        user.lastWearableSync = new Date();
        await user.save();

        ws.send(JSON.stringify({
          event: 'ack',
          type: entry.type,
          value: entry.value,
          timestamp: entry.timestamp,
          totalEntries: wearableHistory.length
        }));

      } catch (err) {
        console.error('WS wearable save error:', err.message);
        ws.send(JSON.stringify({ event: 'error', message: 'Failed to save data' }));
      }
    });

    ws.on('close', () => {
      clearInterval(throttleInterval);
      console.log(`WS client disconnected: user ${userId}`);
    });

    ws.on('error', (err) => {
      clearInterval(throttleInterval);
      console.error(`WS error for user ${userId}:`, err.message);
    });
  });

  return wss;
}

module.exports = { initWebSocket };

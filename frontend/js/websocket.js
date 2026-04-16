/**
 * WebSocket module — handles real-time heart rate/steps streaming.
 */
const WS = (() => {
  const WS_URL = 'ws://localhost:5000/ws/wearable';
  let socket = null;
  let simulateTimer = null;

  function init() {
    document.getElementById('ws-connect-btn').addEventListener('click', connect);
    document.getElementById('ws-disconnect-btn').addEventListener('click', disconnect);
    document.getElementById('ws-send-hr').addEventListener('click', sendHeartRate);
    document.getElementById('ws-send-steps').addEventListener('click', sendSteps);
    document.getElementById('ws-simulate-btn').addEventListener('click', toggleSimulation);
  }

  function connect() {
    const token = API.getToken();
    if (!token) {
      logMessage('error', 'Not authenticated. Please login first.');
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(url);

    socket.onopen = () => {
      setStatus('connected');
      setSendEnabled(true);
      logMessage('info', 'WebSocket connected. Ready to stream.');
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        logMessage('info', event.data);
        return;
      }

      if (data.event === 'connected') {
        logMessage('info', data.message);
      } else if (data.event === 'ack') {
        logMessage('success', `✓ ${data.type}: ${data.value} saved (total: ${data.totalEntries})`);
      } else if (data.event === 'error') {
        logMessage('error', data.message);
      } else {
        logMessage('info', JSON.stringify(data));
      }
    };

    socket.onclose = (event) => {
      setStatus('disconnected');
      setSendEnabled(false);
      stopSimulation();
      if (event.reason) {
        logMessage('error', `Disconnected: ${event.reason}`);
      } else {
        logMessage('info', 'WebSocket disconnected.');
      }
      socket = null;
    };

    socket.onerror = () => {
      logMessage('error', 'WebSocket connection error.');
    };
  }

  function disconnect() {
    stopSimulation();
    if (socket) {
      socket.close();
      socket = null;
    }
  }

  function send(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      logMessage('error', 'Not connected. Click Connect first.');
      return;
    }
    socket.send(JSON.stringify(payload));
  }

  function sendHeartRate() {
    const val = parseFloat(document.getElementById('ws-hr').value);
    if (isNaN(val) || val < 0 || val > 300) {
      logMessage('error', 'Enter a valid heart rate (0-300)');
      return;
    }
    const device = document.getElementById('ws-device').value;
    send({ type: 'heartRate', value: val, deviceType: device });
  }

  function sendSteps() {
    const val = parseInt(document.getElementById('ws-steps').value, 10);
    if (isNaN(val) || val < 0) {
      logMessage('error', 'Enter a valid step count (>= 0)');
      return;
    }
    const device = document.getElementById('ws-device').value;
    send({ type: 'steps', value: val, deviceType: device });
  }

  function toggleSimulation() {
    if (simulateTimer) {
      stopSimulation();
    } else {
      startSimulation();
    }
  }

  function startSimulation() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      logMessage('error', 'Connect first to start simulation.');
      return;
    }
    const device = document.getElementById('ws-device').value;
    const btn = document.getElementById('ws-simulate-btn');
    btn.textContent = '■ Stop Simulation';
    logMessage('info', 'Simulating live wearable stream every 2s...');

    simulateTimer = setInterval(() => {
      // Simulate realistic heart rate (60-100) and step increments
      const hr = Math.floor(60 + Math.random() * 40);
      const steps = Math.floor(50 + Math.random() * 200);
      send({ type: 'heartRate', value: hr, deviceType: device });
      setTimeout(() => {
        send({ type: 'steps', value: steps, deviceType: device });
      }, 500);
    }, 2000);
  }

  function stopSimulation() {
    if (simulateTimer) {
      clearInterval(simulateTimer);
      simulateTimer = null;
      const btn = document.getElementById('ws-simulate-btn');
      btn.textContent = '▶ Simulate Live Stream';
      logMessage('info', 'Simulation stopped.');
    }
  }

  function setStatus(status) {
    const badge = document.getElementById('ws-status');
    const connectBtn = document.getElementById('ws-connect-btn');
    const disconnectBtn = document.getElementById('ws-disconnect-btn');

    if (status === 'connected') {
      badge.textContent = 'Connected';
      badge.className = 'ws-badge ws-connected';
      connectBtn.classList.add('hidden');
      disconnectBtn.classList.remove('hidden');
    } else {
      badge.textContent = 'Disconnected';
      badge.className = 'ws-badge ws-disconnected';
      connectBtn.classList.remove('hidden');
      disconnectBtn.classList.add('hidden');
    }
  }

  function setSendEnabled(enabled) {
    document.getElementById('ws-send-hr').disabled = !enabled;
    document.getElementById('ws-send-steps').disabled = !enabled;
    document.getElementById('ws-simulate-btn').disabled = !enabled;
  }

  function logMessage(level, text) {
    const log = document.getElementById('ws-log');
    const time = new Date().toLocaleTimeString();
    const colorClass = level === 'error' ? 'ws-log-error' : level === 'success' ? 'ws-log-success' : 'ws-log-info';
    const entry = document.createElement('div');
    entry.className = `ws-log-entry ${colorClass}`;
    entry.textContent = `[${time}] ${text}`;
    log.prepend(entry);

    // Keep max 50 log entries
    while (log.children.length > 50) {
      log.removeChild(log.lastChild);
    }
  }

  function cleanup() {
    stopSimulation();
    if (socket) {
      socket.close();
      socket = null;
    }
  }

  return { init, connect, disconnect, cleanup };
})();

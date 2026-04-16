/**
 * Dashboard module — handles profile and wearable sync UI.
 */
const Dashboard = (() => {
  function init() {
    setupProfileForm();
    setupWearableForm();
    setupLogout();
    setupRefresh();
    setupEncryptedViewer();
    loadUserData();
    WS.init();
  }

  function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', () => {
      WS.cleanup();
      API.clearToken();
      App.showAuth();
    });
  }

  function setupRefresh() {
    document.getElementById('refresh-data-btn').addEventListener('click', loadLatestWearable);
  }

  async function loadUserData() {
    const user = API.getUser();
    if (user) {
      document.getElementById('user-greeting').textContent = `Hello, ${escapeHtml(user.name)}!`;
    }

    // Load profile data
    try {
      const { profile } = await API.getProfile();
      if (profile) {
        populateProfile(profile);
      }
    } catch {
      // Profile not set yet — that's fine
    }

    // Load latest wearable data
    loadLatestWearable();
  }

  function populateProfile(profile) {
    if (profile.age) document.getElementById('profile-age').value = profile.age;
    if (profile.gender) document.getElementById('profile-gender').value = profile.gender;
    if (profile.height) document.getElementById('profile-height').value = profile.height;
    if (profile.weight) document.getElementById('profile-weight').value = profile.weight;
    if (profile.bloodType) document.getElementById('profile-blood').value = profile.bloodType;
    if (profile.activityLevel) document.getElementById('profile-activity').value = profile.activityLevel;
  }

  function setupProfileForm() {
    const form = document.getElementById('profile-form');
    const msgEl = document.getElementById('profile-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msgEl.textContent = '';

      const profileData = {};
      const age = document.getElementById('profile-age').value;
      const gender = document.getElementById('profile-gender').value;
      const height = document.getElementById('profile-height').value;
      const weight = document.getElementById('profile-weight').value;
      const bloodType = document.getElementById('profile-blood').value;
      const activityLevel = document.getElementById('profile-activity').value;

      if (age) profileData.age = parseInt(age, 10);
      if (gender) profileData.gender = gender;
      if (height) profileData.height = parseFloat(height);
      if (weight) profileData.weight = parseFloat(weight);
      if (bloodType) profileData.bloodType = bloodType;
      if (activityLevel) profileData.activityLevel = activityLevel;

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        await API.updateProfile(profileData);
        msgEl.textContent = '✓ Profile saved (encrypted on server).';
        msgEl.className = 'success-msg';
      } catch (err) {
        msgEl.textContent = err.message;
        msgEl.className = 'error-msg';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Profile';
      }
    });
  }

  function setupWearableForm() {
    const form = document.getElementById('wearable-form');
    const msgEl = document.getElementById('sync-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msgEl.textContent = '';

      const deviceType = document.getElementById('device-type').value;
      if (!deviceType) {
        msgEl.textContent = 'Please select a device type.';
        msgEl.className = 'error-msg';
        return;
      }

      const data = {};
      const hr = document.getElementById('sync-hr').value;
      const steps = document.getElementById('sync-steps').value;
      const calories = document.getElementById('sync-calories').value;
      const sleep = document.getElementById('sync-sleep').value;
      const spo2 = document.getElementById('sync-spo2').value;
      const temp = document.getElementById('sync-temp').value;

      if (hr) data.heartRate = parseFloat(hr);
      if (steps) data.steps = parseInt(steps, 10);
      if (calories) data.calories = parseFloat(calories);
      if (sleep) data.sleepHours = parseFloat(sleep);
      if (spo2) data.bloodOxygen = parseFloat(spo2);
      if (temp) data.temperature = parseFloat(temp);

      if (Object.keys(data).length === 0) {
        msgEl.textContent = 'Please enter at least one data point.';
        msgEl.className = 'error-msg';
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Syncing...';

      try {
        const result = await API.syncWearable(deviceType, data);
        msgEl.textContent = `✓ Synced! Total entries: ${result.totalEntries}`;
        msgEl.className = 'success-msg';
        loadLatestWearable();
      } catch (err) {
        msgEl.textContent = err.message;
        msgEl.className = 'error-msg';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sync Data';
      }
    });
  }

  async function loadLatestWearable() {
    const container = document.getElementById('latest-data');
    try {
      const result = await API.getLatestWearable();
      if (!result.latest) {
        container.innerHTML = '<p class="muted">No wearable data synced yet.</p>';
        return;
      }

      const entry = result.latest;
      const d = entry.data;
      let html = `<div class="data-grid">`;

      if (d.heartRate != null) html += dataCard('Heart Rate', d.heartRate, 'bpm');
      if (d.steps != null) html += dataCard('Steps', d.steps.toLocaleString(), '');
      if (d.calories != null) html += dataCard('Calories', d.calories, 'kcal');
      if (d.sleepHours != null) html += dataCard('Sleep', d.sleepHours, 'hrs');
      if (d.bloodOxygen != null) html += dataCard('SpO₂', d.bloodOxygen, '%');
      if (d.temperature != null) html += dataCard('Temperature', d.temperature, '°C');

      html += `</div>`;
      html += `<p class="sync-time">Device: ${escapeHtml(entry.deviceType)} · Synced: ${new Date(entry.syncedAt).toLocaleString()}</p>`;

      container.innerHTML = html;
    } catch {
      container.innerHTML = '<p class="muted">Could not load wearable data.</p>';
    }
  }

  function dataCard(label, value, unit) {
    return `<div class="data-item">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(String(value))} <span class="unit">${escapeHtml(unit)}</span></div>
    </div>`;
  }

  // ---- Encrypted Data Viewer ----
  let rawData = null;
  let activeView = 'profile';

  function setupEncryptedViewer() {
    document.querySelectorAll('.viewer-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.viewer-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeView = tab.dataset.view;
        if (rawData) renderEncryptedView();
      });
    });

    document.getElementById('load-encrypted-btn').addEventListener('click', loadEncryptedData);
  }

  async function loadEncryptedData() {
    const btn = document.getElementById('load-encrypted-btn');
    btn.disabled = true;
    btn.textContent = 'Loading...';
    try {
      rawData = await API.getRawEncryptedData();
      renderEncryptedView();
    } catch (err) {
      document.getElementById('decrypted-pane').textContent = 'Error: ' + err.message;
      document.getElementById('encrypted-pane').textContent = 'Error: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Load Data';
    }
  }

  function renderEncryptedView() {
    const decPane = document.getElementById('decrypted-pane');
    const encPane = document.getElementById('encrypted-pane');

    const source = activeView === 'profile' ? rawData.profile : rawData.wearable;

    if (!source || (!source.encrypted && !source.decrypted)) {
      decPane.textContent = 'No ' + activeView + ' data stored yet.';
      encPane.textContent = 'No ' + activeView + ' data stored yet.';
      return;
    }

    // Decrypted side — pretty-printed JSON
    if (source.decrypted) {
      decPane.textContent = JSON.stringify(source.decrypted, null, 2);
    } else {
      decPane.textContent = 'No data to display.';
    }

    // Encrypted side — the raw hex string with word-wrap
    if (source.encrypted) {
      encPane.textContent = source.encrypted;
    } else {
      encPane.textContent = 'No encrypted data stored.';
    }
  }

  return { init };
})();

/** Escape HTML to prevent XSS */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

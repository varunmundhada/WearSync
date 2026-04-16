/**
 * App — entry point. Decides whether to show auth or dashboard.
 */
const App = (() => {
  function init() {
    Auth.init();

    // If token exists, show dashboard
    if (API.getToken()) {
      showDashboard();
    } else {
      showAuth();
    }
  }

  function showAuth() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
  }

  function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    Dashboard.init();
  }

  // Boot when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  return { showAuth, showDashboard };
})();

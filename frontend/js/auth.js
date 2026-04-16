/**
 * Auth module — handles login/signup form logic.
 */
const Auth = (() => {
  function init() {
    setupTabs();
    setupLoginForm();
    setupSignupForm();
  }

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        document.getElementById('login-form').classList.toggle('hidden', target !== 'login');
        document.getElementById('signup-form').classList.toggle('hidden', target !== 'signup');
        clearMessages();
      });
    });
  }

  function clearMessages() {
    document.getElementById('login-error').textContent = '';
    document.getElementById('signup-error').textContent = '';
    document.getElementById('signup-success').textContent = '';
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span>Please wait...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || 'Submit';
    }
  }

  function setupLoginForm() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = form.querySelector('button[type="submit"]');

      if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
      }

      setLoading(btn, true);
      try {
        const data = await API.login(email, password);
        API.setToken(data.token);
        API.setUser(data.user);
        App.showDashboard();
      } catch (err) {
        errorEl.textContent = err.message;
      } finally {
        setLoading(btn, false);
      }
    });
  }

  function setupSignupForm() {
    const form = document.getElementById('signup-form');
    const errorEl = document.getElementById('signup-error');
    const successEl = document.getElementById('signup-success');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      successEl.textContent = '';

      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      const btn = form.querySelector('button[type="submit"]');

      if (!name || !email || !password || !confirm) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
      }

      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        return;
      }

      if (password.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters.';
        return;
      }

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        errorEl.textContent = 'Password must contain uppercase, lowercase, and a number.';
        return;
      }

      setLoading(btn, true);
      try {
        const data = await API.signup(name, email, password);
        API.setToken(data.token);
        API.setUser(data.user);
        App.showDashboard();
      } catch (err) {
        errorEl.textContent = err.message;
      } finally {
        setLoading(btn, false);
      }
    });
  }

  return { init };
})();

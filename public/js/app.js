/**
 * EverBright MIS — Main Application
 * Orchestrates auth, routing, and view rendering
 */

// ============ GLOBAL STATE ============
const S = {
  // Filters (for list pages)
  filterStatus: '',
  filterCategory: '',
  filterAdviser: '',
  filterInterest: '',
  filterDateFrom: '',
  filterDateTo: '',
  filterActivity: '',
  // Adviser lead tab filter
  leadFilter: 'all',

  // Management dashboard filters
  search: '',
  activityFilter: 'all',
  advFilter: 'all',
  dashFilterAct: '',
  dashFilterAdv: '',
  dashFilterStatus: '',
  dashFilterSrc: '',
  dashDateFrom: '',
  dashDateTo: '',

  // Loading state
  loading: false,
  loadingMsg: '',

  // Toast messages
  toast: null,
  toastTimer: null,
};

// ============ MAIN RENDER LOOP ============
async function render() {
  const root = document.getElementById('app-root');
  if (!root) return;

  // Not logged in → show login page
  if (!Auth.isLoggedIn) {
    root.innerHTML = LoginPage();
    initLoginForm();
    return;
  }

  // Logged in — render based on role and route
  S.loading = true;
  root.innerHTML = AppShell();

  const contentArea = document.getElementById('main-content');
  if (!contentArea) { S.loading = false; return; }

  const route = Router.currentRoute || Router.getDefaultRoute();
  S.loadingMsg = 'Loading...';

  try {
    // === MANAGEMENT ROUTES ===
    if (Auth.isManagement()) {
      // Render sidebar
      const sidebarEl = document.getElementById('mgmt-sidebar');
      if (sidebarEl) sidebarEl.innerHTML = mgmtSidebar(route);

      switch (route) {
        case 'mgmt-dashboard':
          contentArea.innerHTML = await renderMgmtDashboard();
          break;
        case 'mgmt-activities':
          contentArea.innerHTML = await renderMgmtActivities();
          break;
        case 'mgmt-activity-summary':
          contentArea.innerHTML = await renderMgmtActivitySummary(Router.params.id);
          break;
        case 'mgmt-adv-act-summary':
          contentArea.innerHTML = await renderMgmtAdvActSummary(Router.params.actId, Router.params.advId);
          break;
        case 'mgmt-advisers':
          contentArea.innerHTML = await renderMgmtAdvisers();
          break;
        case 'mgmt-adviser-profile':
          contentArea.innerHTML = await renderMgmtAdviserProfile(Router.params.id);
          break;
        case 'mgmt-leads':
          contentArea.innerHTML = await renderMgmtLeads();
          break;
        case 'mgmt-reports':
          contentArea.innerHTML = renderMgmtReports();
          break;
        case 'mgmt-settings':
          contentArea.innerHTML = renderMgmtSettings();
          break;
        case 'lead-detail':
          contentArea.innerHTML = await renderLeadDetail(Router.params.id);
          break;
        default:
          contentArea.innerHTML = await renderMgmtDashboard();
      }
    }

    // === ADVISER ROUTES ===
    else if (Auth.isAdviser()) {
      switch (route) {
        case 'adviser-dashboard':
          contentArea.innerHTML = await renderAdviserDashboard();
          break;
        case 'adviser-leads':
          contentArea.innerHTML = await renderAdviserLeads();
          break;
        case 'adviser-add-lead':
          contentArea.innerHTML = await renderAdviserAddLead();
          break;
        case 'adviser-lead-detail':
          contentArea.innerHTML = await renderAdviserLeadDetail(Router.params.id);
          break;
        case 'adviser-activities':
          contentArea.innerHTML = await renderAdviserActivities();
          break;
        case 'adviser-activity-leads':
          contentArea.innerHTML = await renderAdviserActivityLeads(Router.params.id);
          break;
        case 'adviser-qr':
          contentArea.innerHTML = await renderAdviserQR();
          break;
        case 'adviser-profile':
          contentArea.innerHTML = await renderAdviserProfile();
          break;
        default:
          contentArea.innerHTML = await renderAdviserDashboard();
      }
    }

  } catch (err) {
    console.error('Render error:', err);
    contentArea.innerHTML = `<div class="error-state"><h3>Something went wrong</h3><p>${err.message}</p><button onclick="location.reload()">Reload</button></div>`;
  }

  S.loading = false;
  initListeners();

  // Render adviser bottom nav after content is loaded
  if (Auth.isAdviser()) {
    const bnavContainer = document.getElementById('adv-bnav-container');
    if (bnavContainer) bnavContainer.innerHTML = AdvBottomNav();
  }

  // Render toast if present
  if (S.toast) {
    const toastEl = document.createElement('div');
    toastEl.className = 'toast' + (S.toast.type === 'error' ? ' error' : '');
    toastEl.textContent = S.toast.msg;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }
}

// ============ APP SHELL (Logged-in layout) ============
function AppShell() {
  const isMgmt = Auth.isManagement();
  const userName = Auth.displayName();

  if (isMgmt) {
    return `
    <div class="mgmt-layout">
      <aside class="mgmt-sidebar" id="mgmt-sidebar"></aside>
      <div class="mgmt-body">
        ${AppHeader(userName)}
        <main id="main-content" class="mgmt-content">
          <div class="loading-spinner">Loading...</div>
        </main>
      </div>
    </div>`;
  } else {
    return `
    <div class="adv-layout" id="app-mobile">
      <main id="main-content" class="adv-content-inner">
        <div class="loading-spinner">Loading...</div>
      </main>
      <div id="adv-bnav-container"></div>
    </div>`;
  }
}

function AppHeader(userName) {
  return `
  <header class="app-header">
    <div class="hdr-left">
      <img src="${LOGO_ICON}" alt="EverBright" class="hdr-logo">
      <span class="hdr-brand">EverBright</span>
    </div>
    <div class="hdr-right">
      <span class="hdr-user">${userName}</span>
      <button class="btn-sm" onclick="handleLogout()">Logout</button>
    </div>
  </header>`;
}

// ============ LOGIN PAGE ============
function LoginPage() {
  return `
  <div class="login-page">
    <div class="login-card">
      <img src="${LOGO_FULL}" alt="EverBright Finance" class="login-logo">
      <h2>Marketing Intelligence System</h2>
      <form id="login-form">
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="login-email" placeholder="your@everbright.co.nz" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-password" placeholder="Enter password" required>
        </div>
        <div id="login-error" class="form-error" style="display:none"></div>
        <button type="submit" class="btn-primary btn-block" id="login-btn">Sign In</button>
      </form>
      <p class="login-hint">Default password: EverBright2026!</p>
    </div>
  </div>`;
}

// ============ LOGIN HANDLER ============
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errEl.style.display = 'none';

    const result = await Auth.login(email, password);
    if (!result.success) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
    // On success, Auth.init's onAuthStateChanged will trigger render()
  });
}

// ============ LOGOUT HANDLER ============
async function handleLogout() {
  await Auth.logout();
}

// ============ INITIALIZE APP ============
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  // Initial render (will show login since user is not authenticated)
  render();
});

// ============ EVENT LISTENERS AFTER RENDER ============
function initListeners() {
  // Dropdown filters
  document.querySelectorAll('.filter-select').forEach(sel => {
    sel.addEventListener('change', () => {
      S[sel.dataset.state] = sel.value;
      render();
    });
  });

  // Date filters
  document.querySelectorAll('.filter-date').forEach(inp => {
    inp.addEventListener('change', () => {
      S[inp.dataset.state] = inp.value;
      render();
    });
  });

  // Clear filters
  document.querySelectorAll('.btn-clear-filters').forEach(btn => {
    btn.addEventListener('click', () => {
      S.filterStatus = S.filterCategory = S.filterAdviser = S.filterInterest = S.filterDateFrom = S.filterDateTo = S.filterActivity = '';
      render();
    });
  });
}

// ============ TOAST ============
function showToast(msg, type = 'info') {
  if (S.toastTimer) clearTimeout(S.toastTimer);
  S.toast = { msg, type };
  S.toastTimer = setTimeout(() => { S.toast = null; if (typeof render === 'function') render(); }, 3000);
}

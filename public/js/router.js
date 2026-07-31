/**
 * Simple client-side router for EverBright MIS
 */

const Router = {
  currentRoute: null,
  params: {},
  history: [],
  maxHistory: 20,

  /** Navigate to a route */
  navigate(route, pushHistory = true) {
    if (pushHistory && Router.currentRoute) {
      Router.history.push(Router.currentRoute);
      if (Router.history.length > Router.maxHistory) Router.history.shift();
    }

    // Parse route and params: "mgmt-dashboard" or "mgmt-activity-summary?id=act-001"
    const [path, queryString] = route.split('?');
    Router.currentRoute = path;
    Router.params = {};

    if (queryString) {
      const sp = new URLSearchParams(queryString);
      for (const [k, v] of sp) Router.params[k] = v;
    }

    // Trigger re-render
    if (typeof render === 'function') render();
  },

  /** Go back to previous route */
  goBack() {
    if (Router.history.length > 0) {
      const prev = Router.history.pop();
      Router.currentRoute = prev;
      Router.params = {};
      if (typeof render === 'function') render();
      return true;
    }
    return false;
  },

  /** Go home based on role */
  goHome() {
    Router.history = [];
    if (Auth.isManagement()) {
      Router.navigate('mgmt-dashboard', false);
    } else {
      Router.navigate('adviser-dashboard', false);
    }
  },

  /** Get base role route */
  getDefaultRoute() {
    return Auth.isManagement() ? 'mgmt-dashboard' : 'adviser-dashboard';
  }
};

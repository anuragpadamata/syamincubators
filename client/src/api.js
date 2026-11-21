// Google Apps Script Web App Endpoint
const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxddAk2eDL8Haxo92VOAAsObzoQ3vSUYMQv5yGv9v7lZz0Obl6vc7bLK0GwZ5uM6zemeA/exec';

function getAppsScriptUrl() {
  return (
    import.meta.env.VITE_APPS_SCRIPT_URL ||
    localStorage.getItem('apps_script_url') ||
    DEFAULT_APPS_SCRIPT_URL
  );
}

async function sendRequest(payload) {
  const url = getAppsScriptUrl();
  if (!url) {
    throw new Error(
      'Google Apps Script URL is not set. Please configure it on the Login page or set VITE_APPS_SCRIPT_URL.'
    );
  }

  const token = localStorage.getItem('token');
  const bodyData = {
    ...payload,
    password: payload.password || token || '',
  };

  // Using text/plain avoids CORS preflight OPTIONS request that Google Apps Script does not support
  const res = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(bodyData),
  });

  const data = await res.json();

  if (data && (data.code === 401 || (typeof data.error === 'string' && data.error.includes('Unauthorized')))) {
    localStorage.removeItem('token');
    if (!window.location.hash.includes('/login') && window.location.pathname !== '/login') {
      window.location.hash = '#/login';
    }
    throw new Error(data.error || 'Unauthorized');
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return data;
}

export const api = {
  login: async (username, password) => {
    return sendRequest({ action: 'login', username, password });
  },

  getCustomers: async (search = '') => {
    return sendRequest({ action: 'getCustomers', search });
  },

  getCustomer: async (id) => {
    return sendRequest({ action: 'getCustomer', id });
  },

  createCustomer: async (data) => {
    return sendRequest({ action: 'createCustomer', ...data });
  },

  updateCustomer: async (id, data) => {
    return sendRequest({ action: 'updateCustomer', id, ...data });
  },

  deleteCustomer: async (id) => {
    return sendRequest({ action: 'deleteCustomer', id });
  },

  getHatcheryList: async () => {
    return sendRequest({ action: 'getHatchery' });
  },

  getIncubationDays: async () => {
    const settings = await sendRequest({ action: 'getSettings' });
    return { value: Number(settings.default_incubation_days || 21) };
  },

  updateIncubationDays: async (value) => {
    await sendRequest({
      action: 'updateSettings',
      key: 'default_incubation_days',
      value: String(value),
    });
    return { value: Number(value) };
  },

  getHatcheryDaysBefore: async () => {
    const settings = await sendRequest({ action: 'getSettings' });
    return { value: Number(settings.hatchery_days_before || 3) };
  },

  updateHatcheryDaysBefore: async (value) => {
    await sendRequest({
      action: 'updateSettings',
      key: 'hatchery_days_before',
      value: String(value),
    });
    return { value: Number(value) };
  },

  getPricePerEgg: async () => {
    const settings = await sendRequest({ action: 'getSettings' });
    return { value: Number(settings.default_price_per_egg || 15) };
  },

  updatePricePerEgg: async (value) => {
    await sendRequest({
      action: 'updateSettings',
      key: 'default_price_per_egg',
      value: String(value),
    });
    return { value: Number(value) };
  },

  transliterate: async (texts) => {
    return sendRequest({ action: 'transliterate', texts });
  },
};

export default api;

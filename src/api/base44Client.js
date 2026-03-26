// Drop-in replacement for the Base44 SDK that talks to our local Express API

const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

function createEntityProxy(entityName) {
  return {
    create: (data) => request(`${API_BASE}/entities/${entityName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    bulkCreate: (items) => request(`${API_BASE}/entities/${entityName}/bulk`, {
      method: 'POST',
      body: JSON.stringify(items),
    }),
    list: (sort, limit) => request(`${API_BASE}/entities/${entityName}?sort=${sort || ''}&limit=${limit || ''}`),
    filter: (filters, sort, limit) => request(`${API_BASE}/entities/${entityName}/filter`, {
      method: 'POST',
      body: JSON.stringify({ filters, sort, limit }),
    }),
    update: (id, data) => request(`${API_BASE}/entities/${entityName}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`${API_BASE}/entities/${entityName}/${id}`, {
      method: 'DELETE',
    }),
    // subscribe is a no-op in our local version (no WebSocket needed)
    subscribe: () => () => {},
  };
}

const ENTITY_NAMES = [
  'AppVersion', 'ChatMessage', 'Comment', 'DesignComparison', 'Folder',
  'GameCategory', 'GameEntry', 'Idea', 'LorePage', 'Mechanic',
  'MediaItem', 'PlaytestSession', 'Project', 'ProjectMember', 'Task',
  'TrashItem', 'VersionHistory',
];

const entities = {};
ENTITY_NAMES.forEach(name => { entities[name] = createEntityProxy(name); });

const auth = {
  me: () => request(`${API_BASE}/auth/me`),
  register: (data) => request(`${API_BASE}/auth/register`, { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request(`${API_BASE}/auth/login`, { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request(`${API_BASE}/auth/logout`, { method: 'POST' }),
};

const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    ExtractDataFromUploadedFile: async () => {
      // Not available in self-hosted version
      return { status: 'error', output: null };
    },
  },
};

export const base44 = { entities, auth, integrations };

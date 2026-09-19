// API Service helper for backend endpoints

const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Send & receive HTTP-only cookies
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const authAPI = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () =>
    request("/auth/logout", {
      method: "POST",
    }),

  getMe: () => request("/auth/me"),
};

export const documentAPI = {
  getAll: () => request("/documents"),

  getById: (id) => request(`/documents/${id}`),

  create: (title, language) =>
    request("/documents", {
      method: "POST",
      body: JSON.stringify({ title, language }),
    }),

  share: (id, email) =>
    request(`/documents/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  delete: (id) =>
    request(`/documents/${id}`, {
      method: "DELETE",
    }),
};

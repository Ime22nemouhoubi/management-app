const TOKEN_KEY = 'dinari_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = t => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth')) {
    clearToken();
    window.location.href = '/';
  }
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const fmt = n =>
  new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA';

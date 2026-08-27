const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getTokens() {
  return {
    access: localStorage.getItem('kozmu_access_token'),
    refresh: localStorage.getItem('kozmu_refresh_token'),
  };
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('kozmu_access_token', access);
  localStorage.setItem('kozmu_refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('kozmu_access_token');
  localStorage.removeItem('kozmu_refresh_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    // Only clear tokens on definitive auth rejection — not on server/network errors
    if (res.status === 401 || res.status === 403) {
      clearTokens();
      return null;
    }

    if (!res.ok) return null; // Server sleeping or network issue — keep tokens

    const { data } = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null; // Network error — keep tokens, don't force logout
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const { access } = getTokens();

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (access) headers['Authorization'] = `Bearer ${access}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
    // Only logout if tokens were actually cleared (real auth failure)
    const { refresh } = getTokens();
    if (!refresh) {
      window.dispatchEvent(new CustomEvent('kozmu:logout'));
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro inesperado');
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};

export { setTokens, clearTokens, getTokens };

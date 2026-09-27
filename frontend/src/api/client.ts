import axios, { AxiosError } from "axios";

const ACCESS_TOKEN_KEY = "orthocore_access_token";
const REFRESH_TOKEN_KEY = "orthocore_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((cfg) => {
  const token = tokenStorage.getAccess();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error("No refresh token available");
  const { data } = await axios.post("/api/auth/refresh", { refreshToken });
  const refreshed = tokenStorage.getRefresh()!;
  tokenStorage.set(data.accessToken, refreshed);
  return data.accessToken;
}

// On a 401, attempt exactly one refresh-and-retry per failed request to avoid infinite loops.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) refreshPromise = refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        refreshPromise = null;
        tokenStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * API base URL.
 * - Production: same origin ("") unless VITE_API_URL is set to a non-empty absolute URL.
 * - Development: VITE_API_URL or http://localhost:7002
 */
const explicit = import.meta.env.VITE_API_URL;
const isProd = import.meta.env.PROD || import.meta.env.MODE === "production";

export default {
  api: {
    API_URL:
      explicit !== undefined && String(explicit).length > 0
        ? String(explicit).replace(/\/$/, "")
        : isProd
          ? ""
          : "http://localhost:7002",
  },
};

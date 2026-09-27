const configuredApiUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
const isProduction = process.env.NODE_ENV === "production";
const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredApiUrl);
export const API_BASE_URL =
  isProduction && (!configuredApiUrl || isLocalApi)
    ? "https://currentbackend.onrender.com"
    : configuredApiUrl || "http://localhost:5000";

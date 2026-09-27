export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production" ? "https://currentbackend.onrender.com" : "http://localhost:5000");

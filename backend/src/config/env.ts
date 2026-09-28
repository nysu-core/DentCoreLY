import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173"))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  appUrl: process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173"),

  db: {
    provider: (process.env.DATABASE_PROVIDER || "sqlite") as "sqlite" | "postgresql",
  },

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  storage: {
    provider: (process.env.STORAGE_PROVIDER || "local") as "local" | "imagekit" | "neon",
    baseUrl: process.env.SERVER_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000"),
    local: {
      storagePath: process.env.LOCAL_STORAGE_PATH || "./storage",
    },
    imagekit: {
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
    },
    neon: {
      bucket: process.env.NEON_STORAGE_BUCKET || "upload",
      endpoint: process.env.AWS_ENDPOINT_URL_S3 || "",
      region: process.env.AWS_REGION || "",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  },

  // Gmail SMTP — uses App Password (not your main Gmail password).
  // Setup: Google Account → Security → 2-Step Verification → App passwords → Generate
  // Leave blank in development; emails are printed to console instead.
  email: {
    from:        process.env.GMAIL_USER || "",
    user:        process.env.GMAIL_USER || "",
    appPassword: process.env.GMAIL_APP_PASSWORD || "",
    clinicName:  process.env.CLINIC_NAME || "Orthodontics Department - Benghazi",
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
  },
};

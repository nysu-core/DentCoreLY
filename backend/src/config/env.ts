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
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  appUrl: process.env.APP_URL || "http://localhost:5173",

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
    provider: (process.env.STORAGE_PROVIDER || "local") as "local" | "imagekit",
    local: {
      storagePath: process.env.LOCAL_STORAGE_PATH || "./storage",
      serverBaseUrl: process.env.SERVER_BASE_URL || "http://localhost:4000",
    },
    imagekit: {
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
    },
  },

  // Gmail SMTP — uses App Password (not your main Gmail password).
  // Setup: Google Account → Security → 2-Step Verification → App passwords → Generate
  // Leave blank in development; emails are printed to console instead.
  email: {
    from:        process.env.GMAIL_USER || "",
    user:        process.env.GMAIL_USER || "",
    appPassword: process.env.GMAIL_APP_PASSWORD || "",
    clinicName:  process.env.CLINIC_NAME || "OrthoBen",
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
  },
};

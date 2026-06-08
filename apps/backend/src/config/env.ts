import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  tokenEncryptionKey: required(
    "TOKEN_ENCRYPTION_KEY",
    // 64 hex chars = 32 bytes. Dev-only fallback.
    "0000000000000000000000000000000000000000000000000000000000000000"
  ),
  bankProvider: (process.env.BANK_PROVIDER ?? "mock") as
    | "mock"
    | "tink"
    | "plaid",
  tink: {
    clientId: process.env.TINK_CLIENT_ID ?? "",
    clientSecret: process.env.TINK_CLIENT_SECRET ?? "",
    apiBase: process.env.TINK_API_BASE ?? "https://api.tink.com",
  },
  isProd: process.env.NODE_ENV === "production",
};

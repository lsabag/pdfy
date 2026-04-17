export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  CORS_ORIGIN: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
}

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

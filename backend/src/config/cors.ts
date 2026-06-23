import { config } from "../config";

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === config.corsOrigin) return true;
  if (origin.startsWith("http://localhost:")) return true;
  if (origin.startsWith("http://127.0.0.1:")) return true;
  if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin)) return true;
  if (/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(origin)) return true;
  return false;
}

export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
};

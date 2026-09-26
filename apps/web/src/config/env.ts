/**
 * Browser-side configuration. Values come from Vite env variables
 * (`VITE_*`) and are inlined at build time, so they must never contain secrets.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:4000';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const APP_ENV: string = import.meta.env.MODE;

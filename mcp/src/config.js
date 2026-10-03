import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  apiUrl: (process.env.ARAMBH_API_URL || 'http://localhost:7003').replace(/\/$/, ''),
  apiKey: process.env.ARAMBH_MCP_API_KEY || '',
  port: Number(process.env.PORT || 7337),
  host: process.env.HOST || '0.0.0.0',
  publicUrl: (process.env.MCP_PUBLIC_URL || `http://localhost:${process.env.PORT || 7337}`).replace(
    /\/$/,
    '',
  ),
  name: 'arambh-sports-arena-mcp',
  version: '0.1.0',
};

export default config;

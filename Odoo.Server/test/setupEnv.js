import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.APP_NAME = process.env.APP_NAME || 'Arambh Sports Arena';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-min-8';
process.env.PAYMENTS_PROVIDER = process.env.PAYMENTS_PROVIDER || 'mock';
process.env.CLUB_TIMEZONE = process.env.CLUB_TIMEZONE || 'Asia/Kolkata';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
// Ensure config does not require Atlas URI in tests
if (!process.env.MONGODB_URI && !process.env.DATABASE) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/arambh-test-unused';
}

// Avoid mongod fassert when workspace path contains spaces (Windows).
// Prefer D: (project drive) over C: TEMP which was ENOSPC during Phase 1.
const mongoRoot = fs.existsSync('D:\\')
  ? 'D:\\odoo2026\\tmp\\arambh-mongoms'
  : path.join(os.tmpdir(), 'arambh-mongoms');
fs.mkdirSync(path.join(mongoRoot, 'binaries'), { recursive: true });
fs.mkdirSync(path.join(mongoRoot, 'tmp'), { recursive: true });
process.env.MONGOMS_DOWNLOAD_DIR = path.join(mongoRoot, 'binaries');
process.env.MONGOMS_TMPDIR = path.join(mongoRoot, 'tmp');



import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateFile = path.join(__dirname, '.mongo-memory.json');

function ensureSafeMongoPaths() {
  const root = fs.existsSync('D:\\')
    ? 'D:\\odoo2026\\tmp\\arambh-mongoms'
    : path.join(process.env.TEMP || '/tmp', 'arambh-mongoms');
  fs.mkdirSync(path.join(root, 'binaries'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
  process.env.MONGOMS_DOWNLOAD_DIR = path.join(root, 'binaries');
  process.env.MONGOMS_TMPDIR = path.join(root, 'tmp');
}

export default async function globalSetup() {
  ensureSafeMongoPaths();
  process.env.NODE_ENV = 'test';

  const replSet = await MongoMemoryReplSet.create({
    binary: { version: '7.0.14' },
    instanceOpts: [{ storageEngine: 'wiredTiger' }],
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const uri = replSet.getUri();
  // Keep alive for the whole Jest run
  globalThis.__ARAMBH_MONGO_REPLSET__ = replSet;
  fs.writeFileSync(stateFile, JSON.stringify({ uri }));
  process.env.MONGODB_MEMORY_URI = uri;
}

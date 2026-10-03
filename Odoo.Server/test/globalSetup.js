import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateFile = path.join(__dirname, '.mongo-memory.json');

function ensureSafeMongoPaths() {
  // C: is often nearly full on this machine; keep mongod dbPath + binaries on D:.
  const root = fs.existsSync('D:\\')
    ? 'D:\\odoo2026\\tmp\\arambh-mongoms'
    : path.join(process.env.TEMP || '/tmp', 'arambh-mongoms');
  const tmp = path.join(root, 'tmp');
  const binaries = path.join(root, 'binaries');
  fs.mkdirSync(binaries, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  process.env.MONGOMS_DOWNLOAD_DIR = binaries;
  process.env.MONGOMS_TMPDIR = tmp;
  // mongodb-memory-server falls back to OS TEMP for dbPath; force off C:.
  process.env.TEMP = tmp;
  process.env.TMP = tmp;
  process.env.TMPDIR = tmp;
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

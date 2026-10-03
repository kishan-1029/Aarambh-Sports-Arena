import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateFile = path.join(__dirname, '.mongo-memory.json');

export default async function globalTeardown() {
  const replSet = globalThis.__ARAMBH_MONGO_REPLSET__;
  if (replSet) {
    await replSet.stop();
    globalThis.__ARAMBH_MONGO_REPLSET__ = undefined;
  }
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../../src/lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateFile = path.join(__dirname, '..', '.mongo-memory.json');

function readGlobalUri() {
  if (process.env.MONGODB_MEMORY_URI) return process.env.MONGODB_MEMORY_URI;
  if (fs.existsSync(stateFile)) {
    const { uri } = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return uri;
  }
  throw new Error(
    'MongoMemoryReplSet URI missing. Ensure jest globalSetup started the replica set.',
  );
}

/**
 * Connect mongoose to the Jest globalSetup replica set.
 */
export async function startMemoryMongo() {
  const uri = readGlobalUri();
  if (mongoose.connection.readyState === 1) {
    return uri;
  }
  if (mongoose.connection.readyState !== 0) {
    await disconnectDb();
  }
  await connectDb(uri);
  return uri;
}

export async function stopMemoryMongo() {
  // Connection is shared; disconnect only in globalTeardown / process exit.
  // Per-file teardown clears data instead.
}

export async function clearCollections() {
  if (mongoose.connection.readyState !== 1) return;
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}).catch(() => {})),
  );
}

export default { startMemoryMongo, stopMemoryMongo, clearCollections };

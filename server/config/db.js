import { execFileSync } from 'child_process';
import fs from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoBinary } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { INITIAL_GLOSSARY_ITEMS } from '../db/glossarySeed.js';
import { IngredientGlossary } from '../models/IngredientGlossary.js';
import { LOCAL_MONGO_STORAGE_PATH, MONGO_URI } from './config.js';

let memoryServerInstance = null;

async function startEmbeddedMongoWithRepair() {
  fs.mkdirSync(LOCAL_MONGO_STORAGE_PATH, { recursive: true });

  const startInstance = () =>
    MongoMemoryServer.create({
      instance: {
        dbPath: LOCAL_MONGO_STORAGE_PATH,
        storageEngine: 'wiredTiger',
      },
    });

  try {
    return await startInstance();
  } catch (err) {
    const errText = err instanceof Error ? err.message : String(err);
    if (errText.includes('DBPathInUse') || errText.includes('Unable to lock the lock file')) {
      throw err;
    }
    console.warn('Embedded MongoDB startup failed, attempting WiredTiger repair...', errText);
    try {
      const mongodBin = await MongoBinary.getPath();
      execFileSync(mongodBin, ['--repair', '--dbpath', LOCAL_MONGO_STORAGE_PATH], {
        stdio: 'ignore',
      });
      return await startInstance();
    } catch (repairErr) {
      console.error('MongoDB repair retry failed:', repairErr);
      throw repairErr;
    }
  }
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    // First attempt direct connection to configured MongoDB URL
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`Connected to MongoDB at ${MONGO_URI}`);
  } catch {
    // Fallback to local persistent MongoDB server when no external mongod daemon is running
    memoryServerInstance = await startEmbeddedMongoWithRepair();
    const localUri = memoryServerInstance.getUri('foodlens');
    await mongoose.connect(localUri);
    console.log(`Connected to embedded MongoDB instance (${localUri}) stored at ${LOCAL_MONGO_STORAGE_PATH}`);
  }

  // Seed initial glossary items if collection is empty
  const glossaryCount = await IngredientGlossary.countDocuments();
  if (glossaryCount === 0) {
    await IngredientGlossary.insertMany(INITIAL_GLOSSARY_ITEMS);
    console.log(`Seeded ${INITIAL_GLOSSARY_ITEMS.length} ingredient glossary documents.`);
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
}

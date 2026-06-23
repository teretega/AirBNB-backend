/**
 * Seed script — populates MongoDB with all collections.
 *
 * Usage:
 *   npx ts-node data/seed.ts              # skips collections that already have data
 *   npx ts-node data/seed.ts --force      # wipes and re-seeds all collections
 *   npx ts-node data/seed.ts --only stay  # seed a single collection
 */

import { MongoClient, ObjectId } from 'mongodb'
import * as fs from 'fs'
import * as path from 'path'

try { require('dotenv').config() } catch (_) {}

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stayDB'
const DB_NAME = 'stayDB'
const FORCE   = process.argv.includes('--force')
const ONLY    = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null

const COLLECTIONS = ['stay', 'stays', 'user', 'order']

function mapIds(docs: any[]): any[] {
  return docs.map(doc => ({
    ...doc,
    _id: new ObjectId(doc._id?.$oid ?? doc._id),
  }))
}

async function seedCollection(db: any, name: string) {
  const filePath = path.join(__dirname, `${name}.json`)
  if (!fs.existsSync(filePath)) {
    console.log(`  [${name}] No data file found, skipping.`)
    return
  }

  const docs = mapIds(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
  const col = db.collection(name)
  const existing = await col.countDocuments()

  if (existing > 0) {
    if (!FORCE) {
      console.log(`  [${name}] Already has ${existing} docs — skipping. Use --force to overwrite.`)
      return
    }
    await col.deleteMany({})
    console.log(`  [${name}] Cleared ${existing} existing docs.`)
  }

  await col.insertMany(docs)
  console.log(`  [${name}] Inserted ${docs.length} docs.`)
}

async function seed() {
  const client = new MongoClient(DB_URL)
  try {
    await client.connect()
    console.log(`Connected to: ${DB_URL}\n`)
    const db = client.db(DB_NAME)

    const targets = ONLY ? [ONLY] : COLLECTIONS
    for (const col of targets) {
      await seedCollection(db, col)
    }

    console.log('\nDone.')
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()

#!/usr/bin/env node
// Usage: node scripts/migrate-dirs.js [--dry-run] [--data-dir <path>]
// Renames UUID snippet directories to human-readable slug format.
// Safe to run twice — UUID dirs only. Slug dirs are skipped.

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = path.resolve(__dirname, '..', 'data')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function makeSlug(title) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || 'snippet'
  const hash = randomUUID().replace(/-/g, '').slice(0, 8)
  return `${slug}_${hash}`
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const dataDirIdx = args.indexOf('--data-dir')
  const DATA_DIR = dataDirIdx !== -1 ? path.resolve(args[dataDirIdx + 1]) : DEFAULT_DATA_DIR

  console.log(`Data dir: ${DATA_DIR}`)
  if (dryRun) console.log('DRY RUN — no changes will be made\n')

  let entries
  try {
    entries = await fs.readdir(DATA_DIR)
  } catch (e) {
    console.error(`Cannot read data dir: ${e.message}`)
    process.exit(1)
  }

  const uuidDirs = entries.filter(name => UUID_RE.test(name))
  console.log(`${entries.length} entries total, ${uuidDirs.length} UUID dirs to migrate\n`)

  if (uuidDirs.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const existingNames = new Set(entries)
  const mapping = {}
  let renamed = 0
  let skipped = 0
  let errors = 0

  for (const oldName of uuidDirs) {
    const oldPath = path.join(DATA_DIR, oldName)
    let meta

    try {
      meta = JSON.parse(await fs.readFile(path.join(oldPath, 'meta.json'), 'utf-8'))
    } catch (e) {
      console.warn(`  SKIP  ${oldName} — cannot read meta.json: ${e.message}`)
      skipped++
      continue
    }

    // Generate slug, retry on collision (each call generates fresh hash)
    let newName
    let attempts = 0
    do {
      newName = makeSlug(meta.title || '')
      attempts++
    } while (existingNames.has(newName) && attempts < 20)

    if (attempts >= 20) {
      console.error(`  ERROR ${oldName} — cannot find unique slug after 20 attempts`)
      errors++
      continue
    }

    mapping[oldName] = newName
    console.log(`  ${oldName}  →  ${newName}`)

    if (dryRun) {
      existingNames.add(newName)
      renamed++
      continue
    }

    const newPath = path.join(DATA_DIR, newName)
    try {
      await fs.rename(oldPath, newPath)
      existingNames.delete(oldName)
      existingNames.add(newName)
      const updatedMeta = { ...meta, id: newName }
      await fs.writeFile(path.join(newPath, 'meta.json'), JSON.stringify(updatedMeta, null, 2))
      renamed++
    } catch (e) {
      console.error(`  ERROR ${oldName} → ${newName}: ${e.message}`)
      errors++
    }
  }

  if (!dryRun && Object.keys(mapping).length > 0) {
    const mapPath = path.join(DATA_DIR, '.migration-map.json')
    let existingMap = {}
    try { existingMap = JSON.parse(await fs.readFile(mapPath, 'utf-8')) } catch { /* first run */ }
    await fs.writeFile(mapPath, JSON.stringify({ ...existingMap, ...mapping }, null, 2))
    console.log(`\nMapping written → ${mapPath}`)
  }

  console.log(`\nDone: ${renamed} renamed, ${skipped} skipped, ${errors} errors`)
  if (errors) process.exit(1)
}

main()

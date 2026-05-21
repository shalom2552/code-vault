#!/usr/bin/env node
// Usage: node scripts/rollback-migration.js [--dry-run] [--data-dir <path>]
// Reverses migrate-dirs.js using data/.migration-map.json.

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = path.resolve(__dirname, '..', 'data')

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const dataDirIdx = args.indexOf('--data-dir')
  const DATA_DIR = dataDirIdx !== -1 ? path.resolve(args[dataDirIdx + 1]) : DEFAULT_DATA_DIR

  const mapPath = path.join(DATA_DIR, '.migration-map.json')
  let mapping
  try {
    mapping = JSON.parse(await fs.readFile(mapPath, 'utf-8'))
  } catch (e) {
    console.error(`Cannot read ${mapPath}: ${e.message}`)
    process.exit(1)
  }

  const entries = Object.entries(mapping)
  console.log(`Rolling back ${entries.length} renames`)
  if (dryRun) console.log('DRY RUN — no changes will be made\n')

  let restored = 0
  let errors = 0

  for (const [oldName, newName] of entries) {
    const newPath = path.join(DATA_DIR, newName)
    const oldPath = path.join(DATA_DIR, oldName)

    console.log(`  ${newName}  →  ${oldName}`)
    if (dryRun) { restored++; continue }

    try {
      const meta = JSON.parse(await fs.readFile(path.join(newPath, 'meta.json'), 'utf-8'))
      await fs.rename(newPath, oldPath)
      const restoredMeta = { ...meta, id: oldName }
      await fs.writeFile(path.join(oldPath, 'meta.json'), JSON.stringify(restoredMeta, null, 2))
      restored++
    } catch (e) {
      console.error(`  ERROR ${newName} → ${oldName}: ${e.message}`)
      errors++
    }
  }

  if (!dryRun && !errors) {
    await fs.unlink(mapPath).catch(() => {})
    console.log(`\nMapping file removed`)
  }

  console.log(`\nDone: ${restored} restored, ${errors} errors`)
  if (errors) process.exit(1)
}

main()

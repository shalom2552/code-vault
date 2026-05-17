import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'

export async function makeTmpDir() {
  const dir = path.join(os.tmpdir(), `cppvault-test-${randomUUID()}`)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function removeTmpDir(dir) {
  await fs.rm(dir, { recursive: true, force: true })
}

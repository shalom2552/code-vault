import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs/promises'
import path from 'path'
import { makeApp } from '../helpers/make-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

describe('snippets CRUD', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  // ---------------------------------------------------------------------------
  // GET /api/snippets
  // ---------------------------------------------------------------------------

  describe('GET /api/snippets', () => {
    it('returns empty array when no snippets exist', async () => {
      const emptyDir = await makeTmpDir()
      const res = await request(makeApp(emptyDir)).get('/api/snippets')
      await removeTmpDir(emptyDir)
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('returns all snippets', async () => {
      const dir = await makeTmpDir()
      const localApp = makeApp(dir)
      await request(localApp).post('/api/snippets').send({ title: 'A', files: [{ name: 'main.cpp', content: '' }] })
      await request(localApp).post('/api/snippets').send({ title: 'B', files: [{ name: 'main.cpp', content: '' }] })
      const res = await request(localApp).get('/api/snippets')
      await removeTmpDir(dir)
      expect(res.body).toHaveLength(2)
      expect(res.body.map(s => s.title)).toEqual(expect.arrayContaining(['A', 'B']))
    })

    it('sorts by updatedAt descending', async () => {
      const dir = await makeTmpDir()
      const localApp = makeApp(dir)
      const first = (await request(localApp).post('/api/snippets').send({ title: 'First', files: [{ name: 'main.cpp', content: '' }] })).body
      await new Promise(r => setTimeout(r, 20))
      const second = (await request(localApp).post('/api/snippets').send({ title: 'Second', files: [{ name: 'main.cpp', content: '' }] })).body
      const res = await request(localApp).get('/api/snippets')
      await removeTmpDir(dir)
      expect(res.body[0].id).toBe(second.id)
      expect(res.body[1].id).toBe(first.id)
    })

    it('does not include file contents in listing', async () => {
      const dir = await makeTmpDir()
      const localApp = makeApp(dir)
      await request(localApp).post('/api/snippets').send({ title: 'X', files: [{ name: 'main.cpp', content: 'secret' }] })
      const res = await request(localApp).get('/api/snippets')
      await removeTmpDir(dir)
      expect(res.body[0].files).toEqual(['main.cpp'])
    })
  })

  // ---------------------------------------------------------------------------
  // POST /api/snippets
  // ---------------------------------------------------------------------------

  describe('POST /api/snippets', () => {
    it('returns 201 and meta on success', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'Hello', files: [{ name: 'main.cpp', content: '// hi' }] })
      expect(res.status).toBe(201)
      expect(res.body.id).toBeTruthy()
      expect(res.body.title).toBe('Hello')
      expect(res.body.createdAt).toBeTruthy()
      expect(res.body.updatedAt).toBeTruthy()
    })

    it('returns 400 when files is missing', async () => {
      const res = await request(app).post('/api/snippets').send({ title: 'Bad' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when files is empty array', async () => {
      const res = await request(app).post('/api/snippets').send({ title: 'Bad', files: [] })
      expect(res.status).toBe(400)
    })

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ files: [{ name: 'main.cpp', content: '' }] })
      expect(res.status).toBe(400)
    })

    it('defaults language to cpp when omitted', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'No language', files: [{ name: 'main.cpp', content: '' }] })
      expect(res.body.language).toBe('cpp')
    })

    it('saves provided language to meta', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'C snippet', language: 'c', files: [{ name: 'main.c', content: '' }] })
      expect(res.body.language).toBe('c')
    })

    it('falls back to cpp for unknown language', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'Bad lang', language: 'rust', files: [{ name: 'main.rs', content: '' }] })
      expect(res.body.language).toBe('cpp')
    })

    it('saves tags and notes', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'Tagged', tags: ['algo', 'dp'], notes: 'my note', files: [{ name: 'main.cpp', content: '' }] })
      expect(res.body.tags).toEqual(['algo', 'dp'])
      expect(res.body.notes).toBe('my note')
    })

    it('writes file content to disk', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'Disk', files: [{ name: 'main.cpp', content: 'int x = 1;' }] })
      const content = await fs.readFile(path.join(dataDir, res.body.id, 'main.cpp'), 'utf-8')
      expect(content).toBe('int x = 1;')
    })

    it('writes meta.json to disk', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'Meta', files: [{ name: 'main.cpp', content: '' }] })
      const meta = JSON.parse(await fs.readFile(path.join(dataDir, res.body.id, 'meta.json'), 'utf-8'))
      expect(meta.id).toBe(res.body.id)
      expect(meta.title).toBe('Meta')
    })

    it('stores multiple files', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({ title: 'Multi', files: [{ name: 'main.cpp', content: 'a' }, { name: 'util.cpp', content: 'b' }] })
      expect(res.body.files).toEqual(['main.cpp', 'util.cpp'])
      expect(await fs.readFile(path.join(dataDir, res.body.id, 'main.cpp'), 'utf-8')).toBe('a')
      expect(await fs.readFile(path.join(dataDir, res.body.id, 'util.cpp'), 'utf-8')).toBe('b')
    })
  })

  // ---------------------------------------------------------------------------
  // GET /api/snippets/:id
  // ---------------------------------------------------------------------------

  describe('GET /api/snippets/:id', () => {
    it('returns snippet with file contents', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Read me', files: [{ name: 'main.cpp', content: '// body' }] })).body
      const res = await request(app).get(`/api/snippets/${created.id}`)
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Read me')
      expect(res.body.files[0].name).toBe('main.cpp')
      expect(res.body.files[0].content).toBe('// body')
    })

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app).get('/api/snippets/00000000-0000-0000-0000-000000000000')
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid id format', async () => {
      const res = await request(app).get('/api/snippets/bad.id')
      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // PUT /api/snippets/:id
  // ---------------------------------------------------------------------------

  describe('PUT /api/snippets/:id', () => {
    it('updates title', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Old', files: [{ name: 'main.cpp', content: '' }] })).body
      const res = await request(app).put(`/api/snippets/${created.id}`).send({ title: 'New' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('New')
    })

    it('updates tags and notes', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Tag me', files: [{ name: 'main.cpp', content: '' }] })).body
      const res = await request(app).put(`/api/snippets/${created.id}`).send({ tags: ['x'], notes: 'updated' })
      expect(res.body.tags).toEqual(['x'])
      expect(res.body.notes).toBe('updated')
    })

    it('updates language', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Lang', language: 'cpp', files: [{ name: 'main.cpp', content: '' }] })).body
      const res = await request(app).put(`/api/snippets/${created.id}`).send({ language: 'c', files: [{ name: 'main.c', content: '' }] })
      expect(res.body.language).toBe('c')
    })

    it('bumps updatedAt', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Time', files: [{ name: 'main.cpp', content: '' }] })).body
      await new Promise(r => setTimeout(r, 10))
      const res = await request(app).put(`/api/snippets/${created.id}`).send({ title: 'Time2' })
      expect(res.body.updatedAt).not.toBe(created.updatedAt)
    })

    it('renames file: new file written to disk', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Rename', files: [{ name: 'old.cpp', content: '// old' }] })).body
      await request(app).put(`/api/snippets/${created.id}`).send({ files: [{ name: 'new.cpp', content: '// new' }] })
      const exists = await fs.access(path.join(dataDir, created.id, 'new.cpp')).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('renames file: old file deleted from disk', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Stale', files: [{ name: 'old.cpp', content: '// old' }] })).body
      await request(app).put(`/api/snippets/${created.id}`).send({ files: [{ name: 'new.cpp', content: '// new' }] })
      const exists = await fs.access(path.join(dataDir, created.id, 'old.cpp')).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app).put('/api/snippets/00000000-0000-0000-0000-000000000000').send({ title: 'Ghost' })
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid id format', async () => {
      const res = await request(app).put('/api/snippets/bad.id').send({ title: 'Bad' })
      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // DELETE /api/snippets/:id
  // ---------------------------------------------------------------------------

  describe('DELETE /api/snippets/:id', () => {
    it('returns { ok: true }', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Delete me', files: [{ name: 'main.cpp', content: '' }] })).body
      const res = await request(app).delete(`/api/snippets/${created.id}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('removes snippet directory from disk', async () => {
      const created = (await request(app)
        .post('/api/snippets')
        .send({ title: 'Dir gone', files: [{ name: 'main.cpp', content: '' }] })).body
      await request(app).delete(`/api/snippets/${created.id}`)
      const exists = await fs.access(path.join(dataDir, created.id)).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })

    it('snippet absent from listing after deletion', async () => {
      const dir = await makeTmpDir()
      const localApp = makeApp(dir)
      const created = (await request(localApp)
        .post('/api/snippets')
        .send({ title: 'Gone', files: [{ name: 'main.cpp', content: '' }] })).body
      await request(localApp).delete(`/api/snippets/${created.id}`)
      const res = await request(localApp).get('/api/snippets')
      await removeTmpDir(dir)
      expect(res.body).toHaveLength(0)
    })

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app).delete('/api/snippets/00000000-0000-0000-0000-000000000000')
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid id format', async () => {
      const res = await request(app).delete('/api/snippets/bad.id')
      expect(res.status).toBe(400)
    })
  })
})

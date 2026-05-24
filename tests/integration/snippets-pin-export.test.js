import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { makeApp } from '../helpers/make-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

describe('PATCH /api/snippets/:id/pin', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  it('toggles pinned from false to true', async () => {
    const s = (await request(app).post('/api/snippets').send({
      title: 'Pin me',
      files: [{ name: 'main.cpp', content: '' }],
    })).body
    expect(s.pinned).toBe(false)

    const res = await request(app).patch(`/api/snippets/${s.id}/pin`)
    expect(res.status).toBe(200)
    expect(res.body.pinned).toBe(true)
  })

  it('toggles pinned from true to false', async () => {
    const s = (await request(app).post('/api/snippets').send({
      title: 'Unpin me',
      pinned: true,
      files: [{ name: 'main.cpp', content: '' }],
    })).body
    expect(s.pinned).toBe(true)

    const res = await request(app).patch(`/api/snippets/${s.id}/pin`)
    expect(res.status).toBe(200)
    expect(res.body.pinned).toBe(false)
  })

  it('pin state is persisted — GET reflects updated pin', async () => {
    const s = (await request(app).post('/api/snippets').send({
      title: 'Persist pin',
      files: [{ name: 'main.cpp', content: '' }],
    })).body

    await request(app).patch(`/api/snippets/${s.id}/pin`)
    const res = await request(app).get(`/api/snippets/${s.id}`)
    expect(res.body.pinned).toBe(true)
  })

  it('double-toggle restores original false', async () => {
    const s = (await request(app).post('/api/snippets').send({
      title: 'Double toggle',
      files: [{ name: 'main.cpp', content: '' }],
    })).body

    await request(app).patch(`/api/snippets/${s.id}/pin`)
    const res = await request(app).patch(`/api/snippets/${s.id}/pin`)
    expect(res.body.pinned).toBe(false)
  })

  it('returns 404 for nonexistent id', async () => {
    const res = await request(app).patch('/api/snippets/00000000-0000-0000-0000-000000000000/pin')
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid id format', async () => {
    const res = await request(app).patch('/api/snippets/bad.id/pin')
    expect(res.status).toBe(400)
  })
})

describe('GET /api/export', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  it('returns empty array when no snippets', async () => {
    const dir = await makeTmpDir()
    const res = await request(makeApp(dir)).get('/api/export')
    await removeTmpDir(dir)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns all snippets with file contents', async () => {
    await request(app).post('/api/snippets').send({
      title: 'Export me',
      files: [{ name: 'main.cpp', content: '// exported' }],
    })

    const res = await request(app).get('/api/export')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    const s = res.body.find(x => x.title === 'Export me')
    expect(s).toBeDefined()
    expect(s.files).toHaveLength(1)
    expect(s.files[0].name).toBe('main.cpp')
    expect(s.files[0].content).toBe('// exported')
  })

  it('includes id, title, language, tags in export', async () => {
    const res = await request(app).get('/api/export')
    const s = res.body.find(x => x.title === 'Export me')
    expect(s.id).toBeTruthy()
    expect(s.language).toBe('cpp')
    expect(Array.isArray(s.tags)).toBe(true)
  })

  it('returns multiple snippets', async () => {
    const dir = await makeTmpDir()
    const localApp = makeApp(dir)
    await request(localApp).post('/api/snippets').send({ title: 'A', files: [{ name: 'main.cpp', content: 'a' }] })
    await request(localApp).post('/api/snippets').send({ title: 'B', files: [{ name: 'main.cpp', content: 'b' }] })
    const res = await request(localApp).get('/api/export')
    await removeTmpDir(dir)
    expect(res.body).toHaveLength(2)
  })
})

describe('GET /api/health', () => {
  it('returns { status: ok }', async () => {
    const dir = await makeTmpDir()
    const res = await request(makeApp(dir)).get('/api/health')
    await removeTmpDir(dir)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { makeApp } from '../helpers/make-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

describe('GET /api/snippets search and sort', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
    await request(app).post('/api/snippets').send({
      title: 'Alpha sorting',
      notes: 'unique-note-content',
      tags: ['search-tag'],
      files: [{ name: 'main.cpp', content: '// file-search-needle' }],
    })
    await new Promise(r => setTimeout(r, 20))
    await request(app).post('/api/snippets').send({
      title: 'Beta no match',
      notes: '',
      tags: [],
      files: [{ name: 'main.cpp', content: '// unrelated' }],
    })
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  it('no q param returns all snippets', async () => {
    const res = await request(app).get('/api/snippets')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
  })

  it('search by title match', async () => {
    const res = await request(app).get('/api/snippets?q=alpha')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Alpha sorting')
  })

  it('search by title is case-insensitive', async () => {
    const res = await request(app).get('/api/snippets?q=ALPHA')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Alpha sorting')
  })

  it('search by notes content', async () => {
    const res = await request(app).get('/api/snippets?q=unique-note-content')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].notes).toContain('unique-note-content')
  })

  it('search by tag', async () => {
    const res = await request(app).get('/api/snippets?q=search-tag')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].tags).toContain('search-tag')
  })

  it('search by file content', async () => {
    const res = await request(app).get('/api/snippets?q=file-search-needle')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Alpha sorting')
  })

  it('search with no matches returns empty array', async () => {
    const res = await request(app).get('/api/snippets?q=zzz-no-match-xyz')
    expect(res.body).toEqual([])
  })

  it('pinned snippet sorts before unpinned regardless of updatedAt', async () => {
    const dir = await makeTmpDir()
    const localApp = makeApp(dir)

    await request(localApp).post('/api/snippets').send({
      title: 'Unpinned first created',
      pinned: false,
      files: [{ name: 'main.cpp', content: '' }],
    })
    await new Promise(r => setTimeout(r, 20))
    await request(localApp).post('/api/snippets').send({
      title: 'Pinned second created',
      pinned: true,
      files: [{ name: 'main.cpp', content: '' }],
    })

    const res = await request(localApp).get('/api/snippets')
    await removeTmpDir(dir)

    expect(res.body[0].pinned).toBe(true)
    expect(res.body[1].pinned).toBe(false)
  })

  it('multiple pinned items sort among themselves by updatedAt descending', async () => {
    const dir = await makeTmpDir()
    const localApp = makeApp(dir)

    const first = (await request(localApp).post('/api/snippets').send({
      title: 'Pinned old',
      pinned: true,
      files: [{ name: 'main.cpp', content: '' }],
    })).body
    await new Promise(r => setTimeout(r, 20))
    const second = (await request(localApp).post('/api/snippets').send({
      title: 'Pinned new',
      pinned: true,
      files: [{ name: 'main.cpp', content: '' }],
    })).body

    const res = await request(localApp).get('/api/snippets')
    await removeTmpDir(dir)

    expect(res.body[0].id).toBe(second.id)
    expect(res.body[1].id).toBe(first.id)
  })
})

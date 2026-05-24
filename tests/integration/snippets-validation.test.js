import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { makeApp } from '../helpers/make-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

describe('POST /api/snippets — validation', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  it('returns 400 when title exceeds 100 chars', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'x'.repeat(101),
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/too long/i)
  })

  it('returns 400 when notes exceed 5000 chars', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Valid',
      notes: 'n'.repeat(5001),
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/too long/i)
  })

  it('returns 400 when tags is not an array', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Valid',
      tags: 'not-an-array',
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when tags array exceeds 20 items', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Valid',
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/too many tags/i)
  })

  it('returns 400 when a tag exceeds 50 chars', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Valid',
      tags: ['t'.repeat(51)],
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when a tag is not a string', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Valid',
      tags: [42],
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed compiler flags', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Valid',
      compilerFlags: ['-rm-rf'],
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/disallowed/i)
  })

  it('returns 400 when compilerFlags is not an array', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Valid',
      compilerFlags: '-O2',
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
  })

  it('saves valid compiler flags to meta', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Flags',
      compilerFlags: ['-O2', '-Wall'],
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(201)
    expect(res.body.compilerFlags).toEqual(['-O2', '-Wall'])
  })

  it('defaults compilerFlags to empty array when omitted', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'No flags',
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(201)
    expect(res.body.compilerFlags).toEqual([])
  })

  it('files with dot-prefix names are filtered out (dot-prefix not valid filename)', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: 'Filter dot',
      files: [
        { name: 'main.cpp', content: '// ok' },
        { name: '.env', content: 'SECRET=1' },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.files).not.toContain('.env')
    expect(res.body.files).toContain('main.cpp')
  })

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/api/snippets').send({
      title: '   ',
      files: [{ name: 'main.cpp', content: '' }],
    })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/snippets/:id — validation', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeApp(dataDir)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  async function create() {
    return (await request(app).post('/api/snippets').send({
      title: 'Base',
      files: [{ name: 'main.cpp', content: '' }],
    })).body
  }

  it('returns 400 when updated title exceeds 100 chars', async () => {
    const s = await create()
    const res = await request(app).put(`/api/snippets/${s.id}`).send({ title: 'x'.repeat(101) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when updated title is empty string', async () => {
    const s = await create()
    const res = await request(app).put(`/api/snippets/${s.id}`).send({ title: '' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed compiler flags on update', async () => {
    const s = await create()
    const res = await request(app).put(`/api/snippets/${s.id}`).send({
      compilerFlags: ['--inject-shell-cmd'],
    })
    expect(res.status).toBe(400)
  })

  it('updates compiler flags with valid flags', async () => {
    const s = await create()
    const res = await request(app).put(`/api/snippets/${s.id}`).send({
      compilerFlags: ['-O3', '-Werror'],
    })
    expect(res.status).toBe(200)
    expect(res.body.compilerFlags).toEqual(['-O3', '-Werror'])
  })

  it('returns 400 when updated notes exceed 5000 chars', async () => {
    const s = await create()
    const res = await request(app).put(`/api/snippets/${s.id}`).send({
      notes: 'n'.repeat(5001),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when updated tags is not an array', async () => {
    const s = await create()
    const res = await request(app).put(`/api/snippets/${s.id}`).send({
      tags: 'not-an-array',
    })
    expect(res.status).toBe(400)
  })
})

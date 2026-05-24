import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { makeAuthApp } from '../helpers/make-auth-app.js'
import { makeTmpDir, removeTmpDir } from '../helpers/tmp.js'

const TOKEN = 'test-secret-token'

describe('auth middleware', () => {
  let app, dataDir

  beforeAll(async () => {
    dataDir = await makeTmpDir()
    app = makeAuthApp(dataDir, TOKEN)
  })

  afterAll(async () => {
    await removeTmpDir(dataDir)
  })

  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/snippets')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 401 with wrong token', async () => {
    const res = await request(app)
      .get('/api/snippets')
      .set('Authorization', 'Bearer wrong-token')
    expect(res.status).toBe(401)
  })

  it('returns 401 with malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/snippets')
      .set('Authorization', TOKEN)
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct token', async () => {
    const res = await request(app)
      .get('/api/snippets')
      .set('Authorization', `Bearer ${TOKEN}`)
    expect(res.status).toBe(200)
  })

  it('GET /api/health returns 200 without any token (pre-auth route)', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('POST /api/snippets returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/snippets')
      .send({ title: 'X', files: [{ name: 'main.cpp', content: '' }] })
    expect(res.status).toBe(401)
  })

  it('app without AUTH_TOKEN set passes all requests through', async () => {
    const dir = await makeTmpDir()
    const noAuthApp = makeAuthApp(dir)
    const res = await request(noAuthApp).get('/api/snippets')
    await removeTmpDir(dir)
    expect(res.status).toBe(200)
  })
})

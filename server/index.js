import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer as createViteServer } from 'vite'
import snippetRoutes from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
// P1/P25: PORT from env; default matches docker-compose + Dockerfile (5174)
const PORT = process.env.PORT ?? 5174
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
// P9: static bearer token auth — set AUTH_TOKEN env var to enable
const AUTH_TOKEN = process.env.AUTH_TOKEN

async function main() {
  const app = express()
  // P12: body limit 128 KB — sufficient for code snippets
  app.use(express.json({ limit: '128kb' }))

  // P9: bearer token middleware — all /api routes require Authorization: Bearer <AUTH_TOKEN>
  if (AUTH_TOKEN) {
    app.use('/api', (req, res, next) => {
      if (req.headers.authorization === `Bearer ${AUTH_TOKEN}`) return next()
      res.status(401).json({ error: 'Unauthorized' })
    })
  }

  app.use('/api', snippetRoutes(DATA_DIR))

  if (isProd) {
    const dist = path.join(__dirname, '..', 'dist')
    app.use(express.static(dist))
    app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')))
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }

  // P31: global error handler — catches async errors Express 5 propagates via next(err)
  app.use((err, req, res, next) => {
    console.error('unhandled error', err)
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' })
  })

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeVault → http://0.0.0.0:${PORT}`)
  })
}

// P6: catch startup failures (bad Vite config, port in use) — prevent silent crash
main().catch(err => {
  console.error('startup failed', err)
  process.exit(1)
})

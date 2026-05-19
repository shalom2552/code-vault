import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer as createViteServer } from 'vite'
import snippetRoutes from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = 5173
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')

async function main() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeVault → http://0.0.0.0:${PORT}`)
  })
}

main()

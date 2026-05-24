import express from 'express'
import snippetRoutes from '../../server/routes.js'

export function makeAuthApp(dataDir, authToken) {
  const app = express()
  app.use(express.json())
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  if (authToken) {
    app.use('/api', (req, res, next) => {
      if (req.headers.authorization === `Bearer ${authToken}`) return next()
      res.status(401).json({ error: 'Unauthorized' })
    })
  }
  app.use('/api', snippetRoutes(dataDir))
  return app
}

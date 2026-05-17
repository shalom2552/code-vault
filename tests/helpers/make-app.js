import express from 'express'
import snippetRoutes from '../../server/routes.js'

export function makeApp(dataDir) {
  const app = express()
  app.use(express.json())
  app.use('/api', snippetRoutes(dataDir))
  return app
}

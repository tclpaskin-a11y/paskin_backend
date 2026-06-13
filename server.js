import 'dotenv/config'

import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import productPublicRoutes from './routes/productPublicRoutes.js'
import categoryPublicRoutes from './routes/categoryPublicRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import addressRoutes from './routes/addressRoutes.js'
import userOrderRoutes from './routes/userOrderRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { blogRouter } from './routes/blogRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import paymentApp from './src/app.js'

const app = express()

const corsOptions = {
  origin: ['https://paskin.co.in', 'https://www.paskin.co.in' , 'http://localhost:8080'],
  credentials: true
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'))

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/products', productPublicRoutes)
app.use('/api/categories', categoryPublicRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/address', addressRoutes)
app.use('/api/orders', userOrderRoutes)
app.use('/api/user', userRoutes)
app.use('/api/blogs', blogRouter)
app.use(paymentApp)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

const printRoutes = (expressApp) => {
  const routes = []

  const traverse = (router, prefix = '') => {
    if (!router || !router.stack) return
    router.stack.forEach((layer) => {
      if (layer.route) {
        const path = (prefix + layer.route.path).replace(/\/+/g, '/')
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase())
        methods.forEach(method => {
          routes.push(`${method} ${path}`)
        })
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        let path = prefix
        if (layer.regexp) {
          const match = layer.regexp.toString().match(/^\/\^\\\/([a-zA-Z0-9_-]+(?:\\\/[a-zA-Z0-9_-]+)*)/)
          if (match && match[1]) {
            path += '/' + match[1].replace(/\\/g, '')
          }
        }
        traverse(layer.handle, path)
      } else if (layer.handle && layer.handle.stack && (layer.name === 'mounted_app' || layer.handle.mountpath)) {
        const mountpath = layer.handle.mountpath || ''
        traverse(layer.handle._router || layer.handle, prefix + mountpath)
      }
    })
  }

  traverse(expressApp._router)

  console.log('\nREGISTERED ROUTES:')
  console.log([...new Set(routes)].join('\n') + '\n')
}

const startServer = async () => {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      printRoutes(app)
    })
  } catch (error) {
    console.error('Server failed to start:', error)
    process.exit(1)
  }
}

startServer()

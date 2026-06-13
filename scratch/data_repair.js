import 'dotenv/config'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Cart from '../models/Cart.js'
import User from '../models/User.js'

const runRepair = async () => {
  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('MongoDB connected successfully.\n')

    // 2. Check specific missing product
    const targetId = '6a13155da0771d3eee0a3323'
    console.log(`Checking target product ID: ${targetId}`)
    const targetProduct = await Product.findById(targetId)
    if (targetProduct) {
      console.log(`Target product exists! Name: ${targetProduct.name}, isPaused: ${targetProduct.isPaused}, stock: ${targetProduct.stock}`)
    } else {
      console.log('Target product does NOT exist in the database (deleted or invalid ID).\n')
    }

    // 3. Scan all carts for orphan/deleted products
    console.log('Scanning all carts for invalid product references...')
    const carts = await Cart.find({})
    let totalCartsAffected = 0
    let totalItemsRemoved = 0

    for (const cart of carts) {
      const originalCount = cart.products.length
      if (originalCount === 0) continue

      const validProducts = []
      const removedProductIds = []

      for (const item of cart.products) {
        const productExists = await Product.findById(item.productId)
        if (productExists) {
          validProducts.push(item)
        } else {
          removedProductIds.push(item.productId.toString())
        }
      }

      if (removedProductIds.length > 0) {
        const user = await User.findById(cart.userId)
        console.log(`\nCart for User ID: ${cart.userId} (${user ? user.email : 'Unknown User'}) has invalid items:`)
        console.log(`  Removed invalid product IDs: ${removedProductIds.join(', ')}`)
        
        cart.products = validProducts
        await cart.save()
        
        totalCartsAffected++
        totalItemsRemoved += removedProductIds.length
        console.log(`  Cart updated and saved. Items count: ${originalCount} -> ${cart.products.length}`)
      }
    }

    console.log('\n==================================================')
    console.log('DATA REPAIR COMPLETE')
    console.log(`Total Carts Affected: ${totalCartsAffected}`)
    console.log(`Total Invalid Items Removed: ${totalItemsRemoved}`)
    console.log('==================================================\n')

    await mongoose.connection.close()
  } catch (error) {
    console.error('Data repair error:', error)
    process.exit(1)
  }
}

runRepair()

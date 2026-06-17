import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  productName: {
    type: mongoose.Schema.Types.Mixed
  },
  name: {
    type: mongoose.Schema.Types.Mixed
  },
  category: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Category'
  },
  color: {
    type: mongoose.Schema.Types.Mixed
  },
  size: {
    type: mongoose.Schema.Types.Mixed
  },
  description: {
    type: mongoose.Schema.Types.Mixed
  },
  benefits: {
    type: mongoose.Schema.Types.Mixed
  },
  usage: {
    type: mongoose.Schema.Types.Mixed
  },
  ingredients: {
    type: mongoose.Schema.Types.Mixed
  },
  basePrice: {
    type: mongoose.Schema.Types.Mixed
  },
  sellPrice: {
    type: mongoose.Schema.Types.Mixed
  },
  gst: {
    type: mongoose.Schema.Types.Mixed
  },
  stock: {
    type: Number,
    default: 0
  },
  images: [
    {
      type: String,
      required: true
    }
  ],
  isPaused: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Product = mongoose.model('Product', productSchema)
export default Product


import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Category from '../models/Category.js'

// Format response structure for backward compatibility and clean API structure
export const formatProductResponse = (product) => {
  if (!product) return null
  const p = product.toObject ? product.toObject({ virtuals: true }) : { ...product }

  // Sync/resolve productName and name
  const resolvedProductName = p.productName !== undefined ? p.productName : (p.name !== undefined ? p.name : null)
  const resolvedName = p.name !== undefined ? p.name : (p.productName !== undefined ? p.productName : null)

  // Resolve category (plain ObjectId or populated object)
  const resolvedCategory = p.category !== undefined ? p.category : null

  // Resolve images array & image string (pointing to images[0] dynamically)
  const resolvedImages = p.images !== undefined ? p.images : []
  const resolvedImage = p.image !== undefined ? p.image : (resolvedImages.length > 0 ? resolvedImages[0] : null)

  const rawStock = p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0
  const finalStock = rawStock < 0 ? 0 : rawStock
  const inStock = finalStock > 0

  return {
    _id: p._id,
    productName: resolvedProductName,
    name: resolvedName,
    category: resolvedCategory,
    description: p.description !== undefined ? p.description : null,
    benefits: p.benefits !== undefined ? p.benefits : null,
    usage: p.usage !== undefined ? p.usage : null,
    ingredients: p.ingredients !== undefined ? p.ingredients : null,
    basePrice: p.basePrice !== undefined ? p.basePrice : null,
    sellPrice: p.sellPrice !== undefined ? p.sellPrice : null,
    gst: p.gst !== undefined ? p.gst : null,
    stock: finalStock,
    inStock: inStock,
    image: resolvedImage,
    images: resolvedImages,
    isPaused: p.isPaused !== undefined ? p.isPaused : false,
    isFeatured: p.isFeatured !== undefined ? p.isFeatured : false,
    createdAt: p.createdAt !== undefined ? p.createdAt : null,
    __v: p.__v
  }
}

export const formatProductsResponse = (products) => {
  if (!products) return []
  return products.map(formatProductResponse)
}

export const createProduct = async (req, res, next) => {
  try {
    const {
      productName,
      name: bodyName,
      category,
      description,
      benefits,
      usage,
      ingredients,
      basePrice,
      sellPrice,
      gst,
      stock,
      isFeatured
    } = req.body

    // Sync name and productName automatically
    const finalName = productName !== undefined ? productName : bodyName
    const finalProductName = productName !== undefined ? productName : bodyName

    // Extract category ID if passed as object, or check ID if passed as string
    let categoryId = null
    if (category) {
      categoryId = (category && typeof category === 'object' && category._id) ? category._id : category
      
      if (mongoose.isValidObjectId(categoryId)) {
        const categoryExists = await Category.findById(categoryId)
        if (!categoryExists) {
          return res.status(404).json({
            success: false,
            message: 'Category not found'
          })
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format'
        })
      }
    }

    const images = req.files ? req.files.map(file => file.location || file.key) : []

    const product = await Product.create({
      productName: finalProductName,
      name: finalName,
      category: categoryId,
      description,
      benefits,
      usage,
      ingredients,
      basePrice,
      sellPrice,
      gst,
      stock,
      images,
      isFeatured: isFeatured === true || isFeatured === 'true'
    })

    res.status(201).json({
      success: true,
      data: formatProductResponse(product)
    })
  } catch (error) {
    next(error)
  }
}

export const getProducts = async (req, res, next) => {
  try {
    const filter = {}
    if (req.query.featured === 'true') {
      filter.isFeatured = true
    }
    let query = Product.find(filter).populate('category', 'name')
    if (req.query.featured === 'true') {
      query = query.sort({ createdAt: -1 })
    }
    const products = await query
    res.json({ success: true, data: formatProductsResponse(products) })
  } catch (error) {
    next(error)
  }
}

export const getPublicProducts = async (req, res, next) => {
  try {
    const filter = { isPaused: false }
    if (req.query.featured === 'true') {
      filter.isFeatured = true
    }
    let query = Product.find(filter).populate('category', 'name')
    if (req.query.featured === 'true') {
      query = query.sort({ createdAt: -1 })
    }
    const products = await query
    res.json({ success: true, data: formatProductsResponse(products) })
  } catch (error) {
    next(error)
  }
}

export const getPublicProductById = async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await Product.findOne({ _id: id, isPaused: false }).populate('category', 'name')
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }
    res.json({ success: true, data: formatProductResponse(product) })
  } catch (error) {
    next(error)
  }
}

export const searchPublicProducts = async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required' })
    }

    const query = q.trim()
    const products = await Product.find({
      isPaused: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { productName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).populate('category', 'name')

    res.json({ success: true, data: formatProductsResponse(products) })
  } catch (error) {
    next(error)
  }
}

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    // Sync name and productName automatically
    if (updateData.productName !== undefined) {
      updateData.name = updateData.productName
    } else if (updateData.name !== undefined) {
      updateData.productName = updateData.name
    }

    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = updateData.isFeatured === true || updateData.isFeatured === 'true'
    }

    if (updateData.category) {
      const categoryId = (updateData.category && typeof updateData.category === 'object' && updateData.category._id) 
        ? updateData.category._id 
        : updateData.category

      if (mongoose.isValidObjectId(categoryId)) {
        const categoryExists = await Category.findById(categoryId)
        if (!categoryExists) {
          return res.status(404).json({
            success: false,
            message: 'Category not found'
          })
        }
        updateData.category = categoryId
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format'
        })
      }
    }

    // Only update fields present in request body. Never overwrite existing values with undefined.
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    res.json({ success: true, data: formatProductResponse(product) })
  } catch (error) {
    next(error)
  }
}

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await Product.findByIdAndDelete(id)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    res.json({ success: true, message: 'Product deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const pauseProduct = async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await Product.findByIdAndUpdate(
      id,
      { isPaused: true },
      { new: true }
    )

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    res.json({ success: true, data: formatProductResponse(product) })
  } catch (error) {
    next(error)
  }
}


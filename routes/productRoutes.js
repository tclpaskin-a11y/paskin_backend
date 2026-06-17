import express from 'express'
import multer from 'multer'
import { body } from 'express-validator'
import mongoose from 'mongoose'
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  pauseProduct
} from '../controllers/productController.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { adminMediaUpload } from '../middleware/upload.js'

const router = express.Router()
const formParser = multer().none()

const isStringOrNumber = (value) => {
  return typeof value === 'string' || typeof value === 'number'
}

const validateCategoryField = (value) => {
  if (value === undefined || value === null || value === '') return true
  const id = (value && typeof value === 'object' && value._id) ? value._id : value
  if (id && !mongoose.isValidObjectId(id)) {
    throw new Error('Category must be a valid ID')
  }
  return true
}

router.get('/', getProducts)

router.post(
  '/',
  (req, res, next) => {
    adminMediaUpload(4, 'admin')(req, res, err => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message })
      }
      next()
    })
  },
  body('productName').optional().custom(isStringOrNumber).withMessage('Product name must be a string or number'),
  body('category').optional().custom(validateCategoryField),
  body('description').optional().custom(isStringOrNumber).withMessage('Description must be a string or number'),
  body('benefits').optional().custom(isStringOrNumber).withMessage('Benefits must be a string or number'),
  body('usage').optional().custom(isStringOrNumber).withMessage('Usage must be a string or number'),
  body('ingredients').optional().custom(isStringOrNumber).withMessage('Ingredients must be a string or number'),
  body('basePrice').optional().custom(isStringOrNumber).withMessage('Base price must be a string or number'),
  body('sellPrice').optional().custom(isStringOrNumber).withMessage('Sell price must be a string or number'),
  body('gst').optional().custom(isStringOrNumber).withMessage('GST must be a string or number'),
  body('stock').optional().custom(isStringOrNumber).withMessage('Stock must be a string or number'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
  validateRequest,
  createProduct
)

router.patch(
  '/:id',
  formParser,
  body('productName').optional().custom(isStringOrNumber).withMessage('Product name must be a string or number'),
  body('category').optional().custom(validateCategoryField),
  body('description').optional().custom(isStringOrNumber).withMessage('Description must be a string or number'),
  body('benefits').optional().custom(isStringOrNumber).withMessage('Benefits must be a string or number'),
  body('usage').optional().custom(isStringOrNumber).withMessage('Usage must be a string or number'),
  body('ingredients').optional().custom(isStringOrNumber).withMessage('Ingredients must be a string or number'),
  body('basePrice').optional().custom(isStringOrNumber).withMessage('Base price must be a string or number'),
  body('sellPrice').optional().custom(isStringOrNumber).withMessage('Sell price must be a string or number'),
  body('gst').optional().custom(isStringOrNumber).withMessage('GST must be a string or number'),
  body('stock').optional().custom(isStringOrNumber).withMessage('Stock must be a string or number'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
  validateRequest,
  updateProduct
)

router.delete('/:id', deleteProduct)
router.patch('/:id/pause', pauseProduct)

export default router

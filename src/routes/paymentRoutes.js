import express from 'express'
import { createOrder, verifyPayment } from '../controllers/paymentController.js'
import { createOrderValidation, validatePaymentVerification, validateRequest } from '../middleware/validatePayment.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.post('/create-order', authMiddleware, createOrderValidation, validateRequest, createOrder)
router.post('/verify-payment', validatePaymentVerification, validateRequest, verifyPayment)
router.post('/verify', validatePaymentVerification, validateRequest, verifyPayment)

export default router

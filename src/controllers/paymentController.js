import Payment from '../models/paymentModel.js'
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayPayment } from '../services/razorpayService.js'
import { errorResponse, successResponse } from '../utils/response.js'
import Cart from '../../models/Cart.js'
import Product from '../../models/Product.js'

export const createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body
    const amountNumber = Number(amount)

    // Validate amount > 0 and amount >= 100 paise
    if (Number.isNaN(amountNumber) || amountNumber < 100) {
      return errorResponse(res, 'Amount must be at least 100 paise', 400)
    }

    const userId = req.user.id

    // Validate cart items before allowing Razorpay order creation
    const cart = await Cart.findOne({ userId })
    if (!cart || cart.products.length === 0) {
      return errorResponse(res, 'Your cart is empty', 400)
    }

    for (const item of cart.products) {
      const product = await Product.findById(item.productId)
      if (!product) {
        return errorResponse(res, `Product no longer exists: ${item.productId}`, 400)
      }
      if (product.isPaused) {
        return errorResponse(res, `Product is no longer available: ${product.name || 'Product'}`, 400)
      }
      const rawStock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : 0
      const finalStock = rawStock < 0 ? 0 : rawStock
      if (finalStock <= 0 || finalStock < item.quantity) {
        return errorResponse(res, `Insufficient stock for product: ${product.name || 'Product'}`, 400)
      }
    }

    // Validate currency === 'INR'
    if (currency && currency !== 'INR') {
      return errorResponse(res, 'Currency must be INR', 400)
    }

    const amountInPaise = Math.round(amountNumber)
    const order = await createRazorpayOrder(amountInPaise, currency || 'INR', receipt)

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        order
      }
    })
  } catch (error) {
    console.error('createOrder error:', error.message)
    console.error(error)
    return errorResponse(res, 'Unable to create Razorpay order', 500)
  }
}

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    // Ensure all fields are present (Step 7: Production Safety)
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse(res, 'Missing required fields', 400)
    }

    // STEP 3: Verify Signature
    const isValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    })

    if (!isValid) {
      console.error(`Verification failed: Signature mismatch for Order: ${razorpay_order_id}`)
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Please contact support if money was deducted.'
      })
    }

    // STEP 5: Payment Status Validation (Fetch from Razorpay API)
    let paymentDetails
    try {
      paymentDetails = await fetchRazorpayPayment(razorpay_payment_id)
    } catch (apiError) {
      console.error(`Razorpay API error fetching payment ${razorpay_payment_id}:`, apiError.message)
      console.error(apiError)
      return errorResponse(res, 'Failed to fetch payment details from Razorpay', 500)
    }

    if (paymentDetails.status !== 'captured') {
      console.error(`Verification failed: Payment ${razorpay_payment_id} status is ${paymentDetails.status}, expected captured`)
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Please contact support if money was deducted.'
      })
    }

    let paymentRecord = null
    try {
      paymentRecord = await Payment.create({
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'paid'
      })
    } catch (dbError) {
      console.error('Payment DB save error (non-fatal):', dbError.message)
      console.error(dbError)
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentStatus: 'paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      ...(paymentRecord ? { paymentRecordId: paymentRecord._id } : {})
    })
  } catch (error) {
    console.error('verifyPayment error:', error.message)
    console.error(error)
    return errorResponse(res, 'Payment verification failed', 500)
  }
}

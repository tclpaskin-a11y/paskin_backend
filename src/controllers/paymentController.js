import Payment from '../models/paymentModel.js'
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpayService.js'
import { errorResponse, successResponse } from '../utils/response.js'

const convertRupeesToPaise = (amount) => Math.round(Number(amount) * 100)

export const createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body
    const amountNumber = Number(amount)

    if (Number.isNaN(amountNumber) || amountNumber < 100) {
      return errorResponse(res, 'Amount must be at least 100 paise', 400)
    }

    const amountInPaise = Math.round(amountNumber)
    const order = await createRazorpayOrder(amountInPaise, currency, receipt)

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
    console.error('createOrder error:', error)
    return errorResponse(res, 'Unable to create Razorpay order', 500)
  }
}

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    // Ensure all fields are present
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse(res, 'Missing required fields', 400)
    }

    const isValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    })

    if (!isValid) {
      return errorResponse(res, 'Payment verification failed', 400)
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
    console.error('verifyPayment error:', error)
    return errorResponse(res, 'Payment verification failed', 500)
  }
}

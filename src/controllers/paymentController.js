import Payment from '../models/paymentModel.js'
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayPayment } from '../services/razorpayService.js'
import { errorResponse, successResponse } from '../utils/response.js'

export const createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body
    const amountNumber = Number(amount)

    // Validate amount > 0 and amount >= 100 paise
    if (Number.isNaN(amountNumber) || amountNumber < 100) {
      return errorResponse(res, 'Amount must be at least 100 paise', 400)
    }

    // Validate currency === 'INR'
    if (currency && currency !== 'INR') {
      return errorResponse(res, 'Currency must be INR', 400)
    }

    const amountInPaise = Math.round(amountNumber)
    const order = await createRazorpayOrder(amountInPaise, currency || 'INR', receipt)

    // Safe logs only
    console.log(`Order created: ${order.id}, Amount: ${order.amount}, Currency: ${order.currency}`)

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
    console.log('Incoming payload:', req.body)
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

    console.log('Verification result:', isValid)

    if (!isValid) {
      console.log(`Verification failed: Signature mismatch for Order: ${razorpay_order_id}`)
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
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
      console.log(`Verification failed: Payment ${razorpay_payment_id} status is ${paymentDetails.status}, expected captured`)
      return res.status(400).json({
        success: false,
        message: 'Payment not captured'
      })
    }

    // Safe logs: keep only payment_id, order_id, verification status
    console.log(`Payment verified successfully: Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}`)

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

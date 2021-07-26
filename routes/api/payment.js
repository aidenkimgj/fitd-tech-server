import express from 'express';
const router = express.Router();
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_TEST);
//========================================
//         Payment Api
// Author: Aiden Kim, Donghyun(Dean) Kim
//========================================

/*
 * @route     POST   api/payment/
 * @desc      Payment Process
 * @access    Private
 *
 */

router.post('/', async (req, res) => {
  console.log(`+++++Payment req.body`, req.body);
  let { amount, id } = req.body;
  let intAmount = parseInt(amount);
  try {
    const payment = await stripe.paymentIntents.create({
      amount: intAmount,
      currency: 'CAD',
      description: 'fitd company',
      payment_method: id,
      confirm: true,
    });
    console.log('Payment', payment);
    res.json({
      message: 'Payment successful',
      success: true,
    });
  } catch (error) {
    console.log('Error', error);
    res.json({
      message: 'Payment failed',
      success: false,
    });
  }
});

export default router;

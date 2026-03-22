const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const PLAN_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_placeholder';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_placeholder') {
      return res.status(503).json({ error: 'Payments not configured' });
    }

    let customerId;
    const existing = await prisma.subscription.findUnique({ where: { user_id: req.user.id } });

    if (existing?.stripe_customer_id) {
      customerId = existing.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: req.user.email || undefined,
        metadata: { user_id: req.user.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PLAN_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/subscription/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get subscription status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { user_id: req.user.id } });
    res.json({
      status: req.user.subscription_status,
      trial_end: sub?.trial_end || null,
      current_period_end: sub?.current_period_end || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Cancel subscription
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { user_id: req.user.id } });
    if (!sub?.stripe_sub_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    await stripe.subscriptions.update(sub.stripe_sub_id, { cancel_at_period_end: true });

    res.json({ message: 'Subscription will cancel at end of billing period' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const stripeSubId = session.subscription;

        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const userId = stripeSub.metadata?.user_id || await getUserIdByCustomer(customerId);

        if (userId) {
          await upsertSubscription(userId, customerId, stripeSubId, stripeSub);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = await getUserIdByCustomer(sub.customer);
        if (userId) {
          await upsertSubscription(userId, sub.customer, sub.id, sub);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function getUserIdByCustomer(customerId) {
  const sub = await prisma.subscription.findUnique({ where: { stripe_customer_id: customerId } });
  return sub?.user_id || null;
}

async function upsertSubscription(userId, customerId, stripeSubId, stripeSub) {
  const status = mapStripeStatus(stripeSub.status);

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { user_id: userId },
      update: {
        stripe_customer_id: customerId,
        stripe_sub_id: stripeSubId,
        status,
        trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        current_period_end: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
      },
      create: {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_sub_id: stripeSubId,
        status,
        trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        current_period_end: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
      },
    }),
    prisma.user.update({ where: { id: userId }, data: { subscription_status: status } }),
  ]);
}

function mapStripeStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'trialing': return 'TRIALING';
    case 'active': return 'ACTIVE';
    case 'canceled': return 'CANCELED';
    case 'past_due': return 'PAST_DUE';
    default: return 'FREE';
  }
}

module.exports = router;

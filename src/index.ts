import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';

import Stripe from 'stripe';
import { HTTPException } from 'hono/http-exception';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const app = new Hono();
app.use('/*', cors());
app.use(logger());

app.get('/', (c) => {
    return c.text('GET')
});

app.post('/', (c) => {
    return c.text('POST')
});

app.get('/success', (c) => {
    return c.text('Success')
});

app.get('/cancel', (c) => {
    return c.text("Cancel")
});

app.post('/checkout', async (c) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                { price: '', quantity: 1 }
            ],
            mode: 'payment',
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel'
        })
        return c.json(session);
    } catch (err: any) {
        console.error(err);
        throw new HTTPException(500, { message: err?.message })
    }
});

app.post('/webhook', async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');

    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        throw new HTTPException(400)
    }

    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        console.log(subscription)
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        console.log(subscription)
    }

    return c.text('success')
})
const port = 3000
console.log(`server running on port ${port}`)

serve({
    fetch: app.fetch,
    port
})
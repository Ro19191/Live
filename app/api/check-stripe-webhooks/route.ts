import { NextResponse } from "next/server"
import Stripe from "stripe"

const STRIPE_SECRET_KEY =
  "sk_test_51RYwp74CC1aU9e84Sutqrkn6pWtsbulf730HRY90WDcey6dHV1z8gilkoCHbLCGdTN7Zy04soWQoavzDQachOH8t00NaDS9s9A"
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })

export async function GET() {
  try {
    // Récupérer les derniers événements Stripe
    const events = await stripe.events.list({
      limit: 10,
      types: ["checkout.session.completed"],
    })

    console.log("🔍 STRIPE: Found events:", events.data.length)

    const eventDetails = events.data.map((event) => ({
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
      session_id: event.data.object.id,
      payment_status: event.data.object.payment_status,
      customer_email: event.data.object.customer_details?.email,
      amount_total: event.data.object.amount_total,
      metadata: event.data.object.metadata,
    }))

    // Récupérer les webhook endpoints configurés
    const webhookEndpoints = await stripe.webhookEndpoints.list()

    return NextResponse.json({
      recent_events: eventDetails,
      webhook_endpoints: webhookEndpoints.data.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        enabled_events: endpoint.enabled_events,
        status: endpoint.status,
      })),
      webhook_url_should_be: "https://v0-rt-ashy.vercel.app/api/webhooks/stripe",
      instructions: {
        step1: "Check if you have webhook configured in Stripe Dashboard",
        step2: "Go to https://dashboard.stripe.com/test/webhooks",
        step3: "Add endpoint: https://v0-rt-ashy.vercel.app/api/webhooks/stripe",
        step4: "Select event: checkout.session.completed",
        step5: "Copy the webhook secret and add it to STRIPE_WEBHOOK_SECRET env var",
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    })
  }
}

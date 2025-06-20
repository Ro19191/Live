import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(
  "sk_test_51RYwp74CC1aU9e84Sutqrkn6pWtsbulf730HRY90WDcey6dHV1z8gilkoCHbLCGdTN7Zy04soWQoavzDQachOH8t00NaDS9s9A",
  {
    apiVersion: "2024-06-20",
  },
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID manquant" }, { status: 400 })
    }

    // Récupérer les détails de la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return NextResponse.json({
      customerName: session.metadata?.customerName,
      customerPhone: session.metadata?.customerPhone,
      deliveryAddress: session.metadata?.deliveryAddress,
      servicePointId: session.metadata?.servicePointId,
      servicePointName: session.metadata?.servicePointName,
      servicePointAddress: session.metadata?.servicePointAddress,
      postNumber: session.metadata?.postNumber,
      amount: session.amount_total,
      currency: session.currency,
    })
  } catch (error) {
    console.error("Erreur récupération détails:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des détails" }, { status: 500 })
  }
}

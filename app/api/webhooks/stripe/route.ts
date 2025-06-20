import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import type { Readable } from "stream"

const STRIPE_SECRET_KEY =
  "sk_test_51RYwp74CC1aU9e84Sutqrkn6pWtsbulf730HRY90WDcey6dHV1z8gilkoCHbLCGdTN7Zy04soWQoavzDQachOH8t00NaDS9s9A"
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_placeholder"
const { SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } = process.env

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })

async function buffer(readable: Readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

// 🔧 SIMPLE: Transformer n'importe quelle référence en article avec poids standard
function createArticleFromReference(reference: string, quantity = 1, price = 20) {
  const STANDARD_WEIGHT = 20 // 20g par article comme demandé

  console.log(`📦 ARTICLE: "${reference}" → Article avec ${STANDARD_WEIGHT}g`)

  return {
    reference: reference,
    name: reference, // Le nom = la référence saisie
    weight: STANDARD_WEIGHT,
    quantity: quantity,
    price: price,
    total_weight: STANDARD_WEIGHT * quantity,
  }
}

async function createSendcloudParcel(metadata: any, sessionId: string) {
  if (!SENDCLOUD_API_KEY || !SENDCLOUD_API_SECRET) {
    throw new Error("Sendcloud API keys not configured")
  }

  console.log("📦 SENDCLOUD: Creating parcel with metadata:", JSON.stringify(metadata, null, 2))

  // 1. Parser les articles
  let products: { reference: string; quantity: number; price: number }[] = []
  try {
    products = JSON.parse(metadata.products || "[]")
  } catch {
    products = [{ reference: "UNKNOWN", quantity: 1, price: 0 }]
  }

  // 2. Calculer poids total (25g par article)
  const WEIGHT_PER_ITEM = 25
  const totalQty = products.reduce((sum, p) => sum + (p.quantity || 1), 0)
  const totalWeight = WEIGHT_PER_ITEM * totalQty // ex: 2 articles → 50g

  console.log(`📦 ARTICLES: ${products.length} types, ${totalQty} articles total`)
  console.log(`📦 POIDS: ${WEIGHT_PER_ITEM}g × ${totalQty} = ${totalWeight}g`)

  // 3. Récupérer infos client & point relais
  const customerName = (metadata.customerName || "").substring(0, 70)
  const customerEmail = (metadata.customerEmail || "").substring(0, 100)
  const phone = (metadata.customerPhone || "").substring(0, 20)
  const street = metadata.servicePointStreet || ""
  const city = metadata.servicePointCity || ""
  const postal = metadata.servicePointPostalCode || ""
  const servicePointId = Number(metadata.servicePointId)

  // 4. ID de la méthode 0–0.25kg
  const SHIPMENT_ID = 155

  // 5. Construire le payload
  const parcelPayload = {
    parcel: {
      name: customerName,
      company_name: "Mina Paris",
      address: street,
      city,
      postal_code: postal,
      country: "FR",
      email: customerEmail,
      telephone: phone,
      order_number: `MINA-${sessionId.slice(-10)}`,
      weight: totalWeight,
      service_point_id: servicePointId,
      shipment: { id: SHIPMENT_ID },
      parcel_items: products.map((p) => ({
        description: `Réf : ${p.reference}`,
        quantity: p.quantity || 1,
        weight: WEIGHT_PER_ITEM,
        value: Number(p.price),
        hs_code: "6109",
        origin_country: "FR",
      })),
    },
  }

  console.log("📦 SENDCLOUD: Payload final:")
  console.log(`  - Poids total: ${parcelPayload.parcel.weight}g`)
  console.log(`  - Articles: ${parcelPayload.parcel.parcel_items.length}`)
  console.log(`  - Service Point: ${parcelPayload.parcel.service_point_id}`)
  console.log(`  - Shipment ID: ${parcelPayload.parcel.shipment.id}`)

  parcelPayload.parcel.parcel_items.forEach((item, i) => {
    console.log(`    ${i + 1}. "${item.description}" - ${item.weight}g × ${item.quantity}`)
  })

  // 6. Envoi à Sendcloud
  const response = await fetch("https://panel.sendcloud.sc/api/v2/parcels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
    },
    body: JSON.stringify(parcelPayload),
  })

  const responseText = await response.text()
  console.log(`📦 SENDCLOUD: Response status: ${response.status}`)
  console.log(`📦 SENDCLOUD: Response body:`, responseText)

  if (!response.ok) {
    try {
      const errorData = JSON.parse(responseText)
      console.error("📦 SENDCLOUD: ❌ ERROR:", JSON.stringify(errorData, null, 2))
    } catch (e) {
      console.error("📦 SENDCLOUD: Raw error:", responseText)
    }
    throw new Error(`Sendcloud API error (${response.status}): ${responseText}`)
  }

  const result = JSON.parse(responseText)
  const parcel = result.parcel

  console.log("📦 SENDCLOUD: ✅ SUCCÈS!")
  console.log(`  - Parcel ID: ${parcel.id}`)
  console.log(`  - Poids demandé: ${totalWeight}g`)
  console.log(`  - Poids créé: ${parcel.weight}g`)
  console.log(`  - Match: ${parcel.weight === totalWeight ? "✅" : "❌"}`)

  // 7. Retourne les infos utiles
  return {
    sendcloud_success: true,
    parcel_id: parcel.id,
    tracking_number: parcel.tracking_number,
    label_url: parcel.label?.label_printer,
    weight_requested: totalWeight,
    weight_created: parcel.weight,
    weight_match: parcel.weight === totalWeight,
    shipment_id: parcel.shipment?.id,
    service_point_id: parcel.service_point_id,
    items_count: parcel.parcel_items?.length || 0,
    articles_created: products.map((p) => ({
      reference: p.reference,
      weight: `${WEIGHT_PER_ITEM}g`,
      quantity: p.quantity,
      total: `${WEIGHT_PER_ITEM * p.quantity}g`,
    })),
  }
}

export async function POST(req: NextRequest) {
  console.log("🚀 WEBHOOK: Received request")

  try {
    const buf = await buffer(req.body as unknown as Readable)
    const sig = req.headers.get("stripe-signature")

    if (!sig) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(buf, sig, STRIPE_WEBHOOK_SECRET)
    console.log("🚀 WEBHOOK: Event verified:", event.type, event.id)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log("🚀 WEBHOOK: Session completed:", session.id)

      if (session.payment_status === "paid") {
        console.log("🚀 WEBHOOK: Payment confirmed, creating Sendcloud parcel...")

        try {
          const result = await createSendcloudParcel(session.metadata, session.id)
          console.log("🚀 WEBHOOK: ✅ Sendcloud parcel created successfully!")

          return NextResponse.json({
            received: true,
            ...result,
            message: "✅ Parcel created - Each reference became an article with 150g",
          })
        } catch (error: any) {
          console.error("🚀 WEBHOOK: ❌ Sendcloud error:", error.message)
          return NextResponse.json({
            received: true,
            sendcloud_error: error.message,
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("🚀 WEBHOOK: Stripe verification error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook Sendcloud - Structure Propre",
    system: "Each article has 25g standard weight",
    shipment_method: "Mondial Relay 0-0.25kg",
    shipment_id: 155,
    weight_per_article: "25g",
    examples: ["REF11 (qty: 1) → 25g", "REF12 (qty: 2) → 50g", "Total: 75g for 3 articles"],
    structure: {
      products_in_metadata: "JSON.stringify([{reference, quantity, price}])",
      weight_calculation: "25g × total_quantity",
      service_point_info: "From servicePoint object in metadata",
    },
  })
}

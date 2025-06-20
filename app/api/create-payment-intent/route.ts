import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Clé test Stripe directement dans le code
const STRIPE_SECRET_KEY =
  "sk_test_51RYwp74CC1aU9e84Sutqrkn6pWtsbulf730HRY90WDcey6dHV1z8gilkoCHbLCGdTN7Zy04soWQoavzDQachOH8t00NaDS9s9A"
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })

export async function POST(request: NextRequest) {
  console.log("🔥 CREATE-PAYMENT-INTENT: Début de la requête")

  try {
    const body = await request.json()
    console.log("🔥 CREATE-PAYMENT-INTENT: Body reçu:", JSON.stringify(body, null, 2))

    const { products, customer, address, servicePoint, postNumber, subtotal, shippingCost, total, tiktokName } = body

    // Validation des données
    if (!products || products.length === 0) {
      console.error("🔥 ERREUR: Pas de produits")
      return NextResponse.json({ error: "Aucun produit dans la commande" }, { status: 400 })
    }

    if (!customer || !customer.email) {
      console.error("🔥 ERREUR: Informations client manquantes:", customer)
      return NextResponse.json({ error: "Informations client manquantes" }, { status: 400 })
    }

    if (!servicePoint) {
      console.error("🔥 ERREUR: Point de retrait manquant:", servicePoint)
      return NextResponse.json({ error: "Point de retrait non sélectionné" }, { status: 400 })
    }

    if (!address) {
      console.error("🔥 ERREUR: Adresse manquante:", address)
      return NextResponse.json({ error: "Adresse manquante" }, { status: 400 })
    }

    // 🔥 IMPORTANT: Métadonnées complètes et structurées pour Sendcloud
    const metadata = {
      // Informations commande
      order_id: `CMD-${Date.now()}`,
      products: JSON.stringify(
        products.map((product) => ({
          reference: product.reference,
          quantity: product.quantity,
          price: product.price,
        })),
      ),

      // Informations client
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerPhone: customer.phone || "",

      // Point de retrait (pas l'adresse client)
      servicePointName: servicePoint.name,
      servicePointStreet: servicePoint.street,
      servicePointCity: servicePoint.city,
      servicePointPostalCode: servicePoint.postal_code,
      servicePointId: servicePoint.id.toString(),

      // Informations supplémentaires
      tiktokName: tiktokName || "",
      subtotal: subtotal.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      total: total.toFixed(2),
      orderDate: new Date().toISOString(),
      paymentMethod: "stripe",
      currency: "EUR",
    }

    console.log("🔥 CREATE-PAYMENT-INTENT: Métadonnées préparées:", JSON.stringify(metadata, null, 2))

    // Validation du code postal avant création PaymentIntent
    const postalCodePattern = /^\d{5}$/
    if (metadata.country === "FR" && !postalCodePattern.test(metadata.postalCode)) {
      console.error("🔥 ERREUR: Code postal français invalide:", metadata.postalCode)
      return NextResponse.json(
        { error: `Code postal français invalide: "${metadata.postalCode}". Doit être 5 chiffres.` },
        { status: 400 },
      )
    }

    // Créer le Payment Intent
    console.log("🔥 CREATE-PAYMENT-INTENT: Création du PaymentIntent...")
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "eur",
      payment_method_types: ["card"],
      metadata: metadata,
      description: `Commande MINA - ${products.length} produit(s) - ${customer.firstName} ${customer.lastName}`,
      receipt_email: customer.email,
    })

    console.log("🔥 CREATE-PAYMENT-INTENT: PaymentIntent créé avec succès:", paymentIntent.id)
    console.log("🔥 CREATE-PAYMENT-INTENT: Métadonnées stockées:", JSON.stringify(paymentIntent.metadata, null, 2))

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: any) {
    console.error("🔥 CREATE-PAYMENT-INTENT: ERREUR GLOBALE:", error.message)
    console.error("🔥 CREATE-PAYMENT-INTENT: Stack trace:", error.stack)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: `Erreur Stripe: ${error.message}` }, { status: 400 })
    }

    return NextResponse.json({ error: `Erreur serveur: ${error.message}` }, { status: 500 })
  }
}

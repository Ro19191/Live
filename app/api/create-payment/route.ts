import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ""

// Utilisation de vos vraies clés Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  console.log("API create-payment appelée")

  try {
    const body = await request.json()
    console.log("Body JSON brut:", body)
    console.log("Données reçues:", body)

    const { products, customer, address, servicePoint, postNumber, subtotal, shippingCost, total, tiktokName } = body

    // Validation des données
    if (!body.products || body.products.length === 0) {
      return NextResponse.json(
        { error: "La commande ne contient aucun produit. Merci d’en ajouter avant de payer." },
        { status: 400 },
      )
    }

    if (!customer || !customer.email) {
      console.error("Informations client manquantes")
      return NextResponse.json({ error: "Informations client manquantes" }, { status: 400 })
    }

    if (!servicePoint) {
      console.error("Point de retrait manquant")
      return NextResponse.json({ error: "Point de retrait non sélectionné" }, { status: 400 })
    }

    // Créer les line items pour Stripe
    const lineItems = [
      // Produits
      ...products.map((product: any) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: product.reference,
          },
          unit_amount: Math.round(product.price * 100), // Stripe utilise les centimes
        },
        quantity: product.quantity,
      })),
      // Frais de livraison
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de livraison - Mondial Relay",
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      },
    ]

    console.log("Line items créés:", lineItems)

    // Créer la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/`,
      customer_email: customer.email,
      metadata: {
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone || "",
        deliveryAddress: `${address.street}, ${address.city} ${address.postalCode}`,
        servicePointId: servicePoint.id.toString(),
        servicePointName: servicePoint.name,
        servicePointAddress: `${servicePoint.street}, ${servicePoint.city}`,
        postNumber: postNumber || "",
        tiktokName: tiktokName || "",
        subtotal: subtotal.toString(),
        shippingCost: shippingCost.toString(),
      },
    })

    console.log("Session Stripe créée:", session.id)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Erreur création paiement:", error)

    // Gestion spécifique des erreurs Stripe
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: `Erreur Stripe: ${error.message}`,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: `Erreur serveur: ${error.message}`,
      },
      { status: 500 },
    )
  }
}

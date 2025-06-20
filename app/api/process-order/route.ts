import { NextResponse, type NextRequest } from "next/server"
import Stripe from "stripe"
import {
  sanitizeString,
  validateEmail,
  validatePostalCode,
  validateCountryCode,
  validatePhoneNumber,
  validateServicePointId,
} from "@/app/lib/sendcloud-validation" // Ensure this path is correct

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const { SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } = process.env

if (!SENDCLOUD_API_KEY || !SENDCLOUD_API_SECRET) {
  console.error("CRITICAL: Sendcloud API keys are not configured!")
  // In a real app, you might not throw here at module load time,
  // but ensure checks are in place before API calls.
  // For Vercel serverless functions, this check at the top is okay.
  throw new Error("Configuration error: Sendcloud API keys missing.")
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("CRITICAL: Stripe API key is not configured!")
  throw new Error("Configuration error: Stripe API key missing.")
}

export async function POST(req: NextRequest) {
  console.log("Processing order request received...")
  try {
    const { paymentIntentId } = await req.json()
    if (!paymentIntentId) {
      console.error("Missing paymentIntentId in request body")
      return NextResponse.json({ error: "paymentIntentId requis" }, { status: 400 })
    }
    console.log(`Retrieved paymentIntentId: ${paymentIntentId}`)

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (pi.status !== "succeeded") {
      console.error(`Payment not confirmed for PaymentIntent ${paymentIntentId}. Status: ${pi.status}`)
      return NextResponse.json({ error: "Paiement non confirmé" }, { status: 400 })
    }
    console.log(`PaymentIntent ${paymentIntentId} confirmed.`)

    const m = pi.metadata
    if (!m) {
      console.error(`Metadata missing for PaymentIntent ${paymentIntentId}`)
      return NextResponse.json({ error: "Stripe metadata manquant" }, { status: 400 })
    }
    console.log("Stripe Metadata:", JSON.stringify(m, null, 2))

    // --- Field-by-Field Validation and Construction ---
    const validatedFields: Record<string, any> = {}
    const validationErrors: string[] = []

    const processField = (
      fieldName: string,
      rawValue: string | undefined | null,
      validator: (val: any, ...args: any[]) => any,
      ...validatorArgs: any[]
    ) => {
      console.log(`Attempting to validate field: ${fieldName}, Raw value: "${rawValue}"`)
      try {
        validatedFields[fieldName] = validator(rawValue, ...validatorArgs)
        console.log(`SUCCESS validating ${fieldName}: Validated value: "${validatedFields[fieldName]}"`)
      } catch (e: any) {
        const errorMessage = `Validation FAILED for ${fieldName} (Raw: "${rawValue}"): ${e.message}`
        console.error(errorMessage)
        validationErrors.push(errorMessage)
      }
    }

    // Validate essential fields first
    // Default to "FR" if m.country is null, undefined, or empty string after sanitization
    const rawCountry = m.country // Keep original for logging
    processField("country", rawCountry || "FR", validateCountryCode)

    // Only proceed if country is valid, as other validations might depend on it
    if (validationErrors.length > 0 && validationErrors.some((err) => err.toLowerCase().includes("country"))) {
      console.error("Halting processing due to country validation failure.")
      return NextResponse.json(
        { error: `Erreur de validation des données: ${validationErrors.join("; ")}` },
        { status: 400 },
      )
    }
    // Use validated country; if country validation failed, this won't be reached.
    // If rawCountry was empty and defaulted to "FR", validatedFields.country will be "FR".
    const currentCountry = validatedFields.country

    processField("name", m.customerName, sanitizeString, 70)
    processField("company_name", m.customerCompanyName, sanitizeString, 35)
    processField("address", m.street, sanitizeString, 70)
    processField("city", m.city, sanitizeString, 35)
    processField("postal_code", m.postalCode, validatePostalCode, currentCountry)
    processField("email", m.customerEmail, validateEmail)
    processField("telephone", m.customerPhone, validatePhoneNumber, currentCountry)
    processField("to_service_point", m.servicePointId, validateServicePointId)
    processField("to_post_number", m.postNumber, sanitizeString, 35)
    processField("order_number", `MINA-${paymentIntentId}`, sanitizeString, 35)
    validatedFields["weight"] = "1000"
    console.log(`SUCCESS validating weight: Validated value: "${validatedFields.weight}"`)

    if (validationErrors.length > 0) {
      console.error("One or more fields failed validation before Sendcloud call.")
      return NextResponse.json(
        { error: `Erreurs de validation des données: ${validationErrors.join("; ")}` },
        { status: 400 },
      )
    }

    const parcelPayload = {
      name: validatedFields.name,
      company_name: validatedFields.company_name,
      address: validatedFields.address,
      city: validatedFields.city,
      postal_code: validatedFields.postal_code,
      country: validatedFields.country,
      email: validatedFields.email,
      telephone: validatedFields.telephone,
      to_service_point: validatedFields.to_service_point,
      to_post_number: validatedFields.to_post_number,
      order_number: validatedFields.order_number,
      weight: validatedFields.weight,
    }

    console.log("FINAL VALIDATED SENDCLOUD PAYLOAD:", JSON.stringify({ parcel: parcelPayload }, null, 2))

    const scRes = await fetch("https://panel.sendcloud.sc/api/v2/parcels/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({ parcel: parcelPayload }),
    })

    const bodyTxt = await scRes.text()
    console.log(`Sendcloud API Response Status: ${scRes.status}`)
    console.log("Sendcloud API Response Body:", bodyTxt)

    if (scRes.status === 401) {
      return NextResponse.json({ error: "Authentification Sendcloud échouée (401)." }, { status: 401 })
    }

    if (!scRes.ok) {
      let detailedError = `Erreur API Sendcloud (${scRes.status})`
      try {
        const errorJson = JSON.parse(bodyTxt)
        if (errorJson.error && errorJson.error.message) {
          detailedError += `: ${errorJson.error.message}`
        } else if (typeof errorJson === "object") {
          const fieldErrors = Object.entries(errorJson)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
            .join("; ")
          if (fieldErrors) detailedError += ` - Détails: ${fieldErrors}`
          else detailedError += `: ${bodyTxt}`
        } else {
          detailedError += `: ${bodyTxt}`
        }
      } catch (e) {
        detailedError += `: ${bodyTxt}`
      }
      console.error(detailedError)
      return NextResponse.json({ error: detailedError }, { status: scRes.status })
    }

    const { parcel: createdParcel } = JSON.parse(bodyTxt)
    console.log("Successfully created Sendcloud parcel:", JSON.stringify(createdParcel, null, 2))
    return NextResponse.json({
      success: true,
      parcelId: createdParcel.id,
      trackingNumber: createdParcel.tracking_number,
    })
  } catch (err: any) {
    console.error("GLOBAL ERROR in process-order:", err.stack || err.message)
    return NextResponse.json({ error: `Erreur interne du serveur: ${err.message}` }, { status: 500 })
  }
}

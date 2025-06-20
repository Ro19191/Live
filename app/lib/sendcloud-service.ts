import {
  sanitizeString,
  validateEmail,
  validatePostalCode,
  validateCountryCode,
  validatePhoneNumber,
  validateServicePointId,
} from "@/app/lib/sendcloud-validation"

const { SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } = process.env

if (!SENDCLOUD_API_KEY || !SENDCLOUD_API_SECRET) {
  console.error("CRITICAL: Sendcloud API keys are not configured for sendcloud-service!")
}

interface OrderDataForSendcloud {
  customerName: string
  customerEmail: string
  customerPhone?: string
  street: string
  city: string
  postalCode: string
  country: string
  servicePointId: string
  postNumber?: string
  paymentIntentId?: string
}

interface SendcloudResult {
  success: boolean
  parcelId?: string
  trackingNumber?: string
  orderNumber?: string
  error?: string
}

export async function createSendcloudParcel(data: OrderDataForSendcloud): Promise<SendcloudResult> {
  if (!SENDCLOUD_API_KEY || !SENDCLOUD_API_SECRET) {
    const errorMsg = "Sendcloud API keys are not configured."
    console.error(`createSendcloudParcel: ${errorMsg}`)
    return { success: false, error: errorMsg }
  }

  console.log("📦 SENDCLOUD: Creating parcel with data:", JSON.stringify(data, null, 2))

  try {
    // Validation des données
    const validatedCountry = validateCountryCode(data.country || "FR")

    const parcelPayload = {
      name: sanitizeString(data.customerName, 70),
      address: sanitizeString(data.street, 70),
      city: sanitizeString(data.city, 35),
      postal_code: validatePostalCode(data.postalCode, validatedCountry),
      country: validatedCountry,
      email: validateEmail(data.customerEmail),
      telephone: data.customerPhone ? validatePhoneNumber(data.customerPhone, validatedCountry) : "",
      to_service_point: validateServicePointId(data.servicePointId),
      to_post_number: data.postNumber ? sanitizeString(data.postNumber, 35) : "",
      order_number: sanitizeString(
        data.paymentIntentId ? `MINA-${data.paymentIntentId.slice(-10)}` : `MINA-${Date.now()}`,
        35,
      ),
      weight: "1000",
    }

    console.log("📦 SENDCLOUD: Validated payload:", JSON.stringify({ parcel: parcelPayload }, null, 2))

    const scRes = await fetch("https://panel.sendcloud.sc/api/v2/parcels/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({ parcel: parcelPayload }),
    })

    const bodyTxt = await scRes.text()
    console.log(`📦 SENDCLOUD: API Response Status: ${scRes.status}`)
    console.log(`📦 SENDCLOUD: API Response Body:`, bodyTxt)

    if (!scRes.ok) {
      let detailedError = `Sendcloud API Error (${scRes.status})`
      try {
        const errorJson = JSON.parse(bodyTxt)
        if (errorJson.error && errorJson.error.message) {
          detailedError += `: ${errorJson.error.message}`
        } else if (typeof errorJson === "object") {
          const fieldErrors = Object.entries(errorJson)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
            .join("; ")
          if (fieldErrors) detailedError += ` - Details: ${fieldErrors}`
          else detailedError += `: ${bodyTxt}`
        } else {
          detailedError += `: ${bodyTxt}`
        }
      } catch (e) {
        detailedError += `: ${bodyTxt}`
      }
      console.error("📦 SENDCLOUD: Error:", detailedError)
      return { success: false, error: detailedError, orderNumber: parcelPayload.order_number }
    }

    const { parcel: createdParcel } = JSON.parse(bodyTxt)
    console.log(`📦 SENDCLOUD: ✅ Successfully created parcel: ID ${createdParcel.id}`)
    return {
      success: true,
      parcelId: createdParcel.id,
      trackingNumber: createdParcel.tracking_number,
      orderNumber: parcelPayload.order_number,
    }
  } catch (err: any) {
    console.error(`📦 SENDCLOUD: Error for PaymentIntent ${data.paymentIntentId}: ${err.message}`, err.stack)
    return { success: false, error: `Validation or internal error: ${err.message}` }
  }
}

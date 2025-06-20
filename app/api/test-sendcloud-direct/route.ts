import { NextResponse } from "next/server"

const { SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } = process.env

export async function POST() {
  if (!SENDCLOUD_API_KEY || !SENDCLOUD_API_SECRET) {
    return NextResponse.json({ error: "Sendcloud API keys not configured" }, { status: 500 })
  }

  console.log("🧪 TEST: Creating test parcel directly...")

  // Test avec des données fixes
  const testParcelPayload = {
    name: "Test Client",
    company_name: "",
    address: "123 Rue de Test",
    address_2: "",
    city: "Paris",
    postal_code: "75001",
    country: "FR",
    email: "test@example.com",
    telephone: "+33123456789",
    order_number: `TEST-${Date.now()}`,
    weight: "80", // 2 vêtements × 40g
    length: "30",
    width: "25",
    height: "5",
    shipment: { id: 8 }, // Votre méthode France
    total_order_value: "29.99",
    total_order_value_currency: "EUR",
    reference: "Test MINA",
    external_order_id: `test-${Date.now()}`,
    parcel_items: [
      {
        description: "Vêtement - T-shirt Test",
        quantity: 1,
        weight: "40",
        value: "19.99",
        sku: "TSHIRT-001",
        origin_country: "FR",
        hs_code: "6109100000",
      },
      {
        description: "Vêtement - Jean Test",
        quantity: 1,
        weight: "40",
        value: "9.99",
        sku: "JEAN-001",
        origin_country: "FR",
        hs_code: "6109100000",
      },
    ],
    customs_invoice_nr: `INV-TEST-${Date.now()}`,
    customs_shipment_type: 2,
  }

  console.log("🧪 TEST: Payload:", JSON.stringify({ parcel: testParcelPayload }, null, 2))

  try {
    const response = await fetch("https://panel.sendcloud.sc/api/v2/parcels/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({ parcel: testParcelPayload }),
    })

    const responseText = await response.text()
    console.log(`🧪 TEST: Response status: ${response.status}`)
    console.log(`🧪 TEST: Response body:`, responseText)

    if (response.ok) {
      const result = JSON.parse(responseText)
      return NextResponse.json({
        success: true,
        message: "✅ Test parcel created successfully!",
        parcel_id: result.parcel?.id,
        tracking_number: result.parcel?.tracking_number,
        weight: result.parcel?.weight,
        items_count: result.parcel?.parcel_items?.length,
        shipping_method: result.parcel?.shipment,
        check_sendcloud_panel: "Go to https://panel.sendcloud.sc/parcels/ to see your test parcel",
      })
    } else {
      let errorDetails = responseText
      try {
        const errorData = JSON.parse(responseText)
        errorDetails = JSON.stringify(errorData, null, 2)
      } catch (e) {
        // Keep raw text
      }

      return NextResponse.json({
        success: false,
        error: `Sendcloud API error (${response.status})`,
        details: errorDetails,
      })
    }
  } catch (error: any) {
    console.error("🧪 TEST: Error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
    })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to create a test parcel in Sendcloud",
    instructions: "This will create a test parcel directly without Stripe webhook",
  })
}

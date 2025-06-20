import { type NextRequest, NextResponse } from "next/server"

const SENDCLOUD_API_KEY = "6259147d-2497-4a46-80d4-a99558fca023"
const SENDCLOUD_API_SECRET = "your-sendcloud-secret" // Vous devez obtenir ceci depuis Sendcloud

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    // Créer l'expédition via l'API Sendcloud
    const shipmentData = {
      name: orderData.customerName,
      company_name: "",
      address: orderData.deliveryAddress.split(",")[0],
      city: orderData.servicePointName,
      postal_code: "",
      country: "FR",
      email: "", // Email du client si disponible
      telephone: orderData.customerPhone || "",
      to_service_point: Number.parseInt(orderData.servicePointId),
      to_post_number: orderData.postNumber,
      weight: "1000", // Poids en grammes - à adapter selon vos produits
      order_number: `ORDER-${Date.now()}`,
    }

    const response = await fetch("https://panel.sendcloud.sc/api/v2/parcels/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify(shipmentData),
    })

    if (!response.ok) {
      throw new Error("Erreur API Sendcloud")
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      parcelId: result.parcel?.id,
      trackingNumber: result.parcel?.tracking_number,
    })
  } catch (error) {
    console.error("Erreur création expédition:", error)
    return NextResponse.json({ error: "Erreur lors de la création de l'expédition" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"

const { SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } = process.env

export async function GET() {
  if (!SENDCLOUD_API_KEY || !SENDCLOUD_API_SECRET) {
    return NextResponse.json({ error: "Sendcloud API keys not configured" }, { status: 500 })
  }

  try {
    console.log("🔍 DEBUG: Fetching Sendcloud configuration...")

    // 1. Informations utilisateur
    const userResponse = await fetch("https://panel.sendcloud.sc/api/v2/user/", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
    })
    const userData = await userResponse.json()

    // 2. Méthodes d'expédition
    const shippingResponse = await fetch("https://panel.sendcloud.sc/api/v2/shipping_methods/", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
    })
    const shippingData = await shippingResponse.json()

    // 3. Intégrations disponibles
    const integrationsResponse = await fetch("https://panel.sendcloud.sc/api/v2/integrations/", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
    })
    const integrationsData = await integrationsResponse.json()

    // 4. Transporteurs disponibles
    const carriersResponse = await fetch("https://panel.sendcloud.sc/api/v2/shipping_methods/", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString("base64")}`,
      },
    })
    const carriersData = await carriersResponse.json()

    console.log("🔍 DEBUG: Shipping methods found:", shippingData.shipping_methods?.length || 0)

    return NextResponse.json({
      user_info: {
        company: userData.company || "N/A",
        email: userData.email || "N/A",
        modules: userData.modules || [],
      },
      shipping_methods: {
        count: shippingData.shipping_methods?.length || 0,
        methods:
          shippingData.shipping_methods?.map((method) => ({
            id: method.id,
            name: method.name,
            carrier: method.carrier,
            service_point_input: method.service_point_input,
            countries: method.countries,
            price: method.price,
            min_weight: method.min_weight,
            max_weight: method.max_weight,
          })) || [],
      },
      integrations: integrationsData.integrations || [],
      recommendations: {
        for_clothing:
          shippingData.shipping_methods?.filter(
            (method) =>
              method.name.toLowerCase().includes("colissimo") ||
              method.name.toLowerCase().includes("mondial") ||
              method.name.toLowerCase().includes("relay") ||
              method.name.toLowerCase().includes("pickup") ||
              method.carrier?.toLowerCase().includes("dpd") ||
              method.carrier?.toLowerCase().includes("ups"),
          ) || [],
      },
      api_status: {
        user_ok: userResponse.ok,
        shipping_ok: shippingResponse.ok,
        integrations_ok: integrationsResponse.ok,
      },
    })
  } catch (error: any) {
    console.error("🔍 DEBUG: Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

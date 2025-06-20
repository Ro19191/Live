import { NextResponse } from "next/server"

export async function GET() {
  const config = {
    environment: "TEST",
    stripe_secret_key: {
      exists: !!process.env.STRIPE_SECRET_KEY,
      starts_with: process.env.STRIPE_SECRET_KEY?.substring(0, 15) + "...",
      is_test_key: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
    },
    stripe_public_key: {
      exists: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      starts_with: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 15) + "...",
      is_test_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_"),
    },
    webhook_secret: {
      exists: !!process.env.STRIPE_WEBHOOK_SECRET,
      starts_with: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + "...",
    },
    sendcloud: {
      api_key_exists: !!process.env.SENDCLOUD_API_KEY,
      api_secret_exists: !!process.env.SENDCLOUD_API_SECRET,
      api_key_starts_with: process.env.SENDCLOUD_API_KEY?.substring(0, 10) + "...",
    },
  }

  return NextResponse.json(config)
}

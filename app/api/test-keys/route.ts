import { NextResponse } from "next/server"

export async function GET() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const stripePublic = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const sendcloudKey = process.env.SENDCLOUD_API_KEY
  const sendcloudSecret = process.env.SENDCLOUD_API_SECRET

  return NextResponse.json({
    stripe_secret_exists: !!stripeSecret,
    stripe_secret_starts_with: stripeSecret?.substring(0, 10) + "...",
    stripe_public_exists: !!stripePublic,
    stripe_public_starts_with: stripePublic?.substring(0, 10) + "...",
    webhook_secret_exists: !!webhookSecret,
    webhook_secret_starts_with: webhookSecret?.substring(0, 10) + "...",
    sendcloud_key_exists: !!sendcloudKey,
    sendcloud_secret_exists: !!sendcloudSecret,
  })
}

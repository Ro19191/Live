"use client"

import type React from "react"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Loader2 } from "lucide-react"

// Clé publique Stripe directement dans le code
const stripePromise = loadStripe(
  "pk_test_51RYwp74CC1aU9e84JJOog06HBimEJQ0ysm0142ZDY2LjU55wgbO7m1g3iihT39SeFrOt8kHbHX3GUQoD3AUZs4bI00WjDh5vmj",
)

interface PaymentFormProps {
  clientSecret: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  total: number
}

function CheckoutForm({
  onSuccess,
  onError,
  total,
}: {
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  total: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    console.log("🔥 PAYMENT-FORM: Début du paiement")

    if (!stripe || !elements) {
      console.error("🔥 PAYMENT-FORM: Stripe ou Elements non chargé")
      return
    }

    setIsLoading(true)

    try {
      console.log("🔥 PAYMENT-FORM: Confirmation du paiement...")
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success`,
        },
        redirect: "if_required",
      })

      if (error) {
        console.error("🔥 PAYMENT-FORM: Erreur paiement:", error)
        onError(error.message || "Erreur lors du paiement")
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("🔥 PAYMENT-FORM: Paiement réussi:", paymentIntent.id)
        console.log("🔥 PAYMENT-FORM: Métadonnées du PaymentIntent:", paymentIntent.metadata)
        onSuccess(paymentIntent.id)
      } else {
        console.log("🔥 PAYMENT-FORM: Statut inattendu:", paymentIntent?.status)
        onError("Statut de paiement inattendu")
      }
    } catch (err: any) {
      console.error("🔥 PAYMENT-FORM: Erreur catch:", err)
      onError("Une erreur inattendue s'est produite")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-gray-50">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
            wallets: {
              applePay: "never",
              googlePay: "never",
            },
          }}
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="text-lg font-bold">Total: {total.toFixed(2)}€</div>
        <Button type="submit" disabled={!stripe || isLoading} className="bg-green-600 hover:bg-green-700 min-w-[150px]">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Payer {total.toFixed(2)}€
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default function PaymentForm({ clientSecret, onSuccess, onError, total }: PaymentFormProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#16a34a",
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="p-2 rounded-full bg-green-100 text-green-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <span>Paiement sécurisé</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm onSuccess={onSuccess} onError={onError} total={total} />
        </Elements>
      </CardContent>
    </Card>
  )
}

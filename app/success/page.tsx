"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Package, Truck } from "lucide-react"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      console.log("Session ID reçu:", sessionId)

      // Récupérer les détails de la commande
      fetch(`/api/order-details?session_id=${sessionId}`)
        .then((res) => {
          console.log("Réponse order-details:", res.status)
          return res.json()
        })
        .then((data) => {
          console.log("Détails commande:", data)
          setOrderDetails(data)
          setIsLoading(false)

          // Créer l'expédition Sendcloud (optionnel)
          if (data && !data.error) {
            createSendcloudShipment(data)
          }
        })
        .catch((error) => {
          console.error("Erreur récupération détails:", error)
          setIsLoading(false)
        })
    } else {
      console.error("Aucun session ID trouvé")
      setIsLoading(false)
    }
  }, [sessionId])

  const createSendcloudShipment = async (orderData: any) => {
    try {
      console.log("Création expédition Sendcloud...")
      const response = await fetch("/api/create-shipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()
      console.log("Résultat expédition:", result)
    } catch (error) {
      console.error("Erreur création expédition:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Traitement de votre commande...</p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-red-600">Erreur: Aucune session de paiement trouvée</p>
            <Button onClick={() => (window.location.href = "/")} className="mt-4">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">Commande confirmée !</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {orderDetails && !orderDetails.error ? (
            <>
              <div className="text-center">
                <p className="text-lg">Merci {orderDetails.customerName} !</p>
                <p className="text-muted-foreground">
                  Votre commande a été confirmée et sera expédiée vers le point de retrait sélectionné.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Package className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Point de retrait</h3>
                    <p>{orderDetails.servicePointName}</p>
                    <p className="text-sm text-muted-foreground">{orderDetails.servicePointAddress}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Truck className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Livraison</h3>
                    <p className="text-sm text-muted-foreground">
                      Vous recevrez un email avec le numéro de suivi une fois votre colis expédié.
                    </p>
                    {orderDetails.postNumber && (
                      <p className="text-sm">Numéro de référence: {orderDetails.postNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold text-blue-800 mb-2">Prochaines étapes</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Vous recevrez un email de confirmation</li>
                  <li>• Votre commande sera préparée et expédiée</li>
                  <li>• Vous serez notifié quand votre colis arrivera au point de retrait</li>
                  <li>• Présentez-vous avec une pièce d'identité pour récupérer votre commande</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-orange-600 mb-4">
                Paiement confirmé, mais erreur lors de la récupération des détails.
              </p>
              <p className="text-sm text-muted-foreground">
                Vous recevrez un email de confirmation avec tous les détails.
              </p>
            </div>
          )}

          <div className="text-center">
            <Button onClick={() => (window.location.href = "/")} className="bg-black hover:bg-gray-800">
              Nouvelle commande
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

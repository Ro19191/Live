"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export default function TestButtons() {
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testSendcloudDirect = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/test-sendcloud-direct", {
        method: "POST",
      })
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const checkStripeWebhooks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/check-stripe-webhooks")
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔧 Tests de Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={testSendcloudDirect} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? "Test en cours..." : "🧪 Test Sendcloud Direct"}
          </Button>
          <Button onClick={checkStripeWebhooks} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
            {isLoading ? "Vérification..." : "🔍 Vérifier Webhooks Stripe"}
          </Button>
        </div>

        {testResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Résultat :</h3>
            <pre className="text-sm overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Test Sendcloud Direct :</strong> Crée un colis test directement dans Sendcloud pour vérifier que
            l'API fonctionne
          </p>
          <p>
            <strong>Vérifier Webhooks :</strong> Vérifie si les webhooks Stripe sont configurés et reçoivent les
            événements
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

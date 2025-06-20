"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Package, User, MapPin, CreditCard, CheckCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import PaymentForm from "./components/PaymentForm"
import AddressAutocomplete from "./components/AddressAutocomplete"

interface Product {
  id: string
  reference: string
  price: number
  quantity: number
}

interface Customer {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface Address {
  street: string
  city: string
  postalCode: string
  country: string
}

interface ServicePoint {
  id: number
  name: string
  street: string
  city: string
  postal_code: string
  country: string
}

export default function OrderForm() {
  // États du formulaire
  const [products, setProducts] = useState<Product[]>([])
  const [newProduct, setNewProduct] = useState({
    reference: "",
    price: "",
  })
  const [tiktokName, setTiktokName] = useState("")
  const [customer, setCustomer] = useState<Customer>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [address, setAddress] = useState<Address>({
    street: "",
    city: "",
    postalCode: "",
    country: "FR",
  })
  const [selectedServicePoint, setSelectedServicePoint] = useState<ServicePoint | null>(null)
  const [postNumber, setPostNumber] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [orderDetails, setOrderDetails] = useState<any>(null)

  const SHIPPING_COST = 5.0 // Frais de livraison Mondial Relay

  // Ajouter un produit
  const addProduct = () => {
    const price = Number.parseFloat(newProduct.price)
    if (newProduct.reference.trim() !== "" && !Number.isNaN(price) && price > 0) {
      const product: Product = {
        id: Date.now().toString(),
        reference: newProduct.reference.toUpperCase(),
        price: price,
        quantity: 1,
      }
      setProducts([...products, product])
      setNewProduct({ reference: "", price: "" })

      console.log("Produit ajouté:", product)
      console.log("Nombre total de produits:", products.length + 1)
    }
  }

  // Supprimer un produit
  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  // Modifier la quantité
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity > 0) {
      setProducts(products.map((p) => (p.id === id ? { ...p, quantity } : p)))
    }
  }

  // Calculer le sous-total
  const calculateSubtotal = () => {
    return products.reduce((total, product) => total + product.price * product.quantity, 0)
  }

  // Calculer le total avec frais de livraison
  const calculateTotal = () => {
    return calculateSubtotal() + SHIPPING_COST
  }

  // 🔧 NOUVEAU: Gérer la sélection d'adresse automatique
  const handleAddressSelect = (addressComponents: Address) => {
    console.log("🏠 Adresse auto-complétée:", addressComponents)
    setAddress(addressComponents)
  }

  // 🔧 CORRIGÉ: Ouvrir le sélecteur de point de retrait Sendcloud avec les bons paramètres
  const openServicePointPicker = () => {
    if (!window.sendcloud) {
      alert("Service Sendcloud non disponible")
      return
    }

    // 🎯 CORRIGÉ: Sendcloud utilise seulement postalCode et city, pas l'adresse complète
    const options = {
      apiKey: "6259147d-2497-4a46-80d4-a99558fca023",
      country: address.country.toLowerCase(),
      language: "fr-fr",
      postalCode: address.postalCode, // ✅ Code postal dans la barre de recherche
      city: address.city, // ✅ Ville dans la barre de recherche
      // ❌ RETIRÉ: address - Sendcloud ne supporte pas ce paramètre
    }

    console.log("🎯 Ouverture Sendcloud avec:", options)
    console.log(`📍 Barre de recherche Sendcloud: "${address.postalCode}, ${address.city}"`)

    window.sendcloud.servicePoints.open(
      options,
      (servicePoint: ServicePoint, postNumber: string) => {
        setSelectedServicePoint(servicePoint)
        setPostNumber(postNumber)
        console.log("✅ Point de retrait sélectionné:", servicePoint)
      },
      (errors: string[]) => {
        console.error("Erreur Sendcloud:", errors)
        alert("Erreur lors de la sélection du point de retrait")
      },
    )
  }

  // 🔧 ALTERNATIVE: Fonction pour pré-remplir manuellement après ouverture
  const openServicePointPickerWithManualFill = () => {
    if (!window.sendcloud) {
      alert("Service Sendcloud non disponible")
      return
    }

    const options = {
      apiKey: "6259147d-2497-4a46-80d4-a99558fca023",
      country: address.country.toLowerCase(),
      language: "fr-fr",
      postalCode: address.postalCode,
      city: address.city,
    }

    console.log("🎯 Ouverture Sendcloud standard:", options)

    window.sendcloud.servicePoints.open(
      options,
      (servicePoint: ServicePoint, postNumber: string) => {
        setSelectedServicePoint(servicePoint)
        setPostNumber(postNumber)
        console.log("✅ Point de retrait sélectionné:", servicePoint)
      },
      (errors: string[]) => {
        console.error("Erreur Sendcloud:", errors)
        alert("Erreur lors de la sélection du point de retrait")
      },
    )

    // 🧪 ESSAI: Pré-remplir la barre de recherche après ouverture
    setTimeout(() => {
      try {
        const searchInput = document.querySelector(
          'input[placeholder*="search"], input[type="search"], .sendcloud-search-input',
        )
        if (searchInput) {
          const fullAddress = `${address.street}, ${address.city}, ${address.postalCode}`
          searchInput.value = fullAddress
          searchInput.dispatchEvent(new Event("input", { bubbles: true }))
          console.log("🎯 Barre de recherche pré-remplie manuellement:", fullAddress)
        } else {
          console.log("❌ Barre de recherche Sendcloud non trouvée")
        }
      } catch (error) {
        console.error("❌ Erreur lors du pré-remplissage manuel:", error)
      }
    }, 1000) // Attendre 1 seconde que Sendcloud se charge
  }

  // Procéder au paiement
  const proceedToPayment = async () => {
    if (products.length === 0) {
      alert("Ajoutez au moins un produit avant de procéder au paiement.")
      return
    }

    setIsLoading(true)

    try {
      console.log("Création du Payment Intent...")

      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products,
          customer,
          address,
          servicePoint: selectedServicePoint,
          postNumber,
          subtotal: calculateSubtotal(),
          shippingCost: SHIPPING_COST,
          total: calculateTotal(),
          tiktokName,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("Payment Intent créé:", data)

      if (data.clientSecret) {
        setClientSecret(data.clientSecret)
        setCurrentStep(4) // Passer à l'étape paiement
      } else if (data.error) {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert(`Erreur lors de la création du paiement: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Gestion du succès du paiement
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log("Paiement réussi, traitement de la commande...")

    try {
      const response = await fetch("/api/process-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId,
        }),
      })

      const result = await response.json()
      console.log("Résultat traitement commande:", result)

      setOrderDetails(result)
      setPaymentSuccess(true)
      setCurrentStep(5)
    } catch (error) {
      console.error("Erreur traitement commande:", error)
      setPaymentSuccess(true)
      setCurrentStep(5)
    }
  }

  // Gestion des erreurs de paiement
  const handlePaymentError = (error: string) => {
    alert(`Erreur de paiement: ${error}`)
  }

  // Validation des étapes
  const canProceedToStep2 = products.length > 0 && tiktokName.trim() !== ""
  const canProceedToStep3 =
    customer.firstName && customer.lastName && customer.email && address.street && address.city && address.postalCode
  const canProceedToPayment = selectedServicePoint !== null

  return (
    <div className="min-h-screen">
      {/* Header avec bannière pleine largeur */}
      <div className="w-full mb-8">
        <div className="w-full">
          {currentStep <= 2 ? (
            <Link href="https://www.minaparis.fr" target="_blank" rel="noopener noreferrer">
              <Image
                src="/mina-banner-black.png"
                alt="MINA PARIS"
                width={1200}
                height={80}
                className="w-full h-20 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                priority
              />
            </Link>
          ) : (
            <Image
              src="/mina-banner-black.png"
              alt="MINA PARIS"
              width={1200}
              height={80}
              className="w-full h-20 object-cover"
              priority
            />
          )}
        </div>

        {/* Navigation des étapes */}
        <div className="container mx-auto px-4 mt-6">
          <div className="flex items-center justify-center space-x-8 text-sm">
            <div
              className={`flex items-center space-x-2 transition-colors ${
                currentStep >= 1 ? "text-pink-600 font-semibold" : "text-gray-400"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  currentStep >= 1 ? "bg-pink-100 text-pink-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span>Produits</span>
            </div>

            <div
              className={`flex items-center space-x-2 transition-colors ${
                currentStep >= 2 ? "text-blue-600 font-semibold" : "text-gray-400"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  currentStep >= 2 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                <User className="w-4 h-4" />
              </div>
              <span>Informations</span>
            </div>

            <div
              className={`flex items-center space-x-2 transition-colors ${
                currentStep >= 3 ? "text-green-600 font-semibold" : "text-gray-400"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  currentStep >= 3 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <span>Point de retrait</span>
            </div>

            <div
              className={`flex items-center space-x-2 transition-colors ${
                currentStep >= 4 ? "text-purple-600 font-semibold" : "text-gray-400"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  currentStep >= 4 ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                <CreditCard className="w-4 h-4" />
              </div>
              <span>Paiement</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        {/* Étape 1: Sélection des produits */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-pink-100 text-pink-600">
                  <Package className="w-5 h-5" />
                </div>
                <span>Sélection des produits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nom TikTok */}
              <div>
                <Label htmlFor="tiktokName">Nom TikTok *</Label>
                <Input
                  id="tiktokName"
                  placeholder="@votre_nom_tiktok"
                  value={tiktokName}
                  onChange={(e) => setTiktokName(e.target.value)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="reference">Référence</Label>
                  <Input
                    id="reference"
                    placeholder="REF001"
                    value={newProduct.reference}
                    onChange={(e) => setNewProduct({ ...newProduct, reference: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="20.00"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addProduct} disabled={!newProduct.reference || !newProduct.price} className="w-full">
                    Ajouter
                  </Button>
                </div>
              </div>

              {products.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Produits sélectionnés:</h3>
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">{product.reference}</span>
                        <div className="text-sm text-muted-foreground">{product.price.toFixed(2)}€ l'unité</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => updateQuantity(product.id, Number.parseInt(e.target.value))}
                          className="w-16"
                        />
                        <Button variant="destructive" size="sm" onClick={() => removeProduct(product.id)}>
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1 text-right">
                    <div className="text-sm">Sous-total: {calculateSubtotal().toFixed(2)}€</div>
                    <div className="text-sm">Frais de livraison (Mondial Relay): {SHIPPING_COST.toFixed(2)}€</div>
                    <div className="font-bold text-lg">Total: {calculateTotal().toFixed(2)}€</div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Informations client et adresse */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <span>Informations de livraison</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={customer.firstName}
                    onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={customer.lastName}
                    onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </div>

              <Separator />

              <h3 className="font-semibold">Adresse de livraison</h3>

              {/* 🔧 Autocomplétion d'adresse */}
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                initialValue={address.street}
                label="Adresse complète"
                placeholder="Commencez à taper votre adresse..."
                required={true}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="Rempli automatiquement"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Code postal *</Label>
                  <Input
                    id="postalCode"
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    placeholder="Rempli automatiquement"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Retour
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 3: Sélection du point de retrait */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <span>Point de retrait</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 🎯 Affichage de l'adresse souhaitée */}
              {address.street && address.city && address.postalCode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>🎯 Recherche de points de retrait près de :</strong>
                  </p>
                  <p className="text-sm text-blue-700 font-medium">
                    {address.street}, {address.city}, {address.postalCode}, {address.country}
                  </p>
                </div>
              )}

              <div className="text-center">
                <Button onClick={openServicePointPicker} size="lg" className="bg-green-600 hover:bg-green-700">
                  Choisir un point de retrait
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Sélectionnez où vous souhaitez récupérer votre commande
                </p>
                <p className="text-xs text-muted-foreground mt-1">Livraison via Mondial Relay - 5€</p>
              </div>

              {selectedServicePoint && (
                <div className="p-4 border rounded bg-green-50">
                  <h3 className="font-semibold text-green-800">Point de retrait sélectionné:</h3>
                  <p className="font-medium">{selectedServicePoint.name}</p>
                  <p>{selectedServicePoint.street}</p>
                  <p>
                    {selectedServicePoint.postal_code} {selectedServicePoint.city}
                  </p>
                  {postNumber && <p className="text-sm">Numéro de colis: {postNumber}</p>}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Retour
                </Button>
                <Button
                  onClick={proceedToPayment}
                  disabled={!canProceedToPayment || isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? "Traitement..." : "Procéder au paiement"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 4: Paiement intégré */}
        {currentStep === 4 && clientSecret && (
          <PaymentForm
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            total={calculateTotal()}
          />
        )}

        {/* Étape 5: Confirmation */}
        {currentStep === 5 && paymentSuccess && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">Commande confirmée !</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg">Merci {customer.firstName} !</p>
              <p className="text-muted-foreground">
                Votre paiement a été confirmé et votre commande a été transmise à Sendcloud pour expédition.
              </p>

              {orderDetails && (
                <div className="bg-blue-50 p-4 rounded text-left">
                  <h3 className="font-semibold text-blue-800 mb-2">Détails de la commande :</h3>
                  {orderDetails.orderNumber && (
                    <p className="text-sm">• Numéro de commande : {orderDetails.orderNumber}</p>
                  )}
                  {orderDetails.parcelId && <p className="text-sm">• ID colis Sendcloud : {orderDetails.parcelId}</p>}
                  {orderDetails.trackingNumber && (
                    <p className="text-sm">• Numéro de suivi : {orderDetails.trackingNumber}</p>
                  )}
                  {orderDetails.warning && <p className="text-sm text-orange-600">• {orderDetails.warning}</p>}
                </div>
              )}

              <Button onClick={() => window.location.reload()} className="bg-black hover:bg-gray-800">
                Nouvelle commande
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Résumé de commande (toujours visible) */}
        {products.length > 0 && currentStep < 5 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Résumé de la commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tiktokName && (
                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>TikTok:</strong> {tiktokName}
                  </div>
                )}
                {products.map((product) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span>
                      {product.reference} x{product.quantity}
                    </span>
                    <span>{(product.price * product.quantity).toFixed(2)}€</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span>Frais de livraison (Mondial Relay)</span>
                  <span>{SHIPPING_COST.toFixed(2)}€</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{calculateTotal().toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Script Sendcloud */}
      <script src="https://embed.sendcloud.sc/spp/1.0.0/api.min.js" async />
    </div>
  )
}

// Types globaux pour Sendcloud
declare global {
  interface Window {
    sendcloud?: {
      servicePoints: {
        open: (
          options: any,
          successCallback: (servicePoint: any, postNumber: string) => void,
          failureCallback: (errors: string[]) => void,
        ) => void
      }
    }
  }
}

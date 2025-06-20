"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddressComponents {
  street: string
  city: string
  postalCode: string
  country: string
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressComponents) => void
  initialValue?: string
  label?: string
  placeholder?: string
  required?: boolean
}

declare global {
  interface Window {
    google?: any
    initGoogleMaps?: () => void
  }
}

export default function AddressAutocomplete({
  onAddressSelect,
  initialValue = "",
  label = "Adresse",
  placeholder = "Commencez à taper votre adresse...",
  required = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)

  // Charger l'API Google Maps avec votre nouvelle clé
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true)
      initializeAutocomplete()
      return
    }

    // Créer le callback global
    window.initGoogleMaps = () => {
      console.log("✅ Google Maps API chargée avec succès")
      setIsLoaded(true)
      initializeAutocomplete()
    }

    // Charger le script Google Maps avec votre nouvelle clé API
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement("script")
      const apiKey = "AIzaSyDRIqdWNdniWyNhpq0RasTByOw7kfjzbFM" // Votre nouvelle clé
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`
      script.async = true
      script.defer = true

      // Gestion des erreurs
      script.onerror = () => {
        console.error("❌ Échec de chargement Google Maps")
        setGoogleError("Erreur de chargement Google Maps")
      }

      document.head.appendChild(script)
      console.log("🔄 Chargement Google Maps API...")
    }

    return () => {
      if (window.initGoogleMaps) {
        delete window.initGoogleMaps
      }
    }
  }, [])

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google) {
      console.error("❌ Google Maps ou input non disponible")
      return
    }

    console.log("🎯 Initialisation de l'autocomplétion Google")

    // Configuration de l'autocomplétion Google
    const options = {
      types: ["address"], // Seulement les adresses
      componentRestrictions: { country: ["fr", "be", "ch", "lu"] }, // Pays francophones
      fields: ["address_components", "formatted_address", "geometry"],
    }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options)

    // Écouter la sélection d'une adresse
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace()
      console.log("🏠 Place sélectionné:", place)

      if (!place.address_components) {
        console.warn("Aucun détail d'adresse trouvé")
        return
      }

      // Extraire les composants de l'adresse
      const addressComponents = extractAddressComponents(place.address_components)

      // Mettre à jour l'input avec l'adresse formatée
      setInputValue(place.formatted_address || inputValue)

      // Notifier le parent
      onAddressSelect(addressComponents)

      console.log("✅ Adresse Google Maps sélectionnée:", addressComponents)
    })

    console.log("✅ Autocomplétion Google initialisée")
  }

  const extractAddressComponents = (components: any[]): AddressComponents => {
    const result: AddressComponents = {
      street: "",
      city: "",
      postalCode: "",
      country: "FR",
    }

    components.forEach((component) => {
      const types = component.types

      if (types.includes("street_number")) {
        result.street = component.long_name + " " + result.street
      } else if (types.includes("route")) {
        result.street = result.street + component.long_name
      } else if (types.includes("locality")) {
        result.city = component.long_name
      } else if (types.includes("administrative_area_level_2") && !result.city) {
        result.city = component.long_name
      } else if (types.includes("postal_code")) {
        result.postalCode = component.long_name
      } else if (types.includes("country")) {
        result.country = component.short_name
      }
    })

    // Nettoyer l'adresse
    result.street = result.street.trim()

    return result
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  return (
    <div>
      <Label htmlFor="address-autocomplete">
        {label} {required && "*"}
      </Label>
      <Input
        ref={inputRef}
        id="address-autocomplete"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={isLoaded ? placeholder : "Chargement Google Maps..."}
        disabled={!isLoaded && !googleError}
        className={!isLoaded && !googleError ? "opacity-50" : ""}
      />

      {/* Messages de statut */}
      {googleError && <p className="text-xs text-red-600 mt-1">❌ {googleError}</p>}
      {!isLoaded && !googleError && <p className="text-xs text-blue-600 mt-1">🔄 Chargement Google Maps...</p>}
      {isLoaded && !googleError && (
        <p className="text-xs text-green-600 mt-1">✅ Google Maps prêt - Tapez votre adresse</p>
      )}
    </div>
  )
}

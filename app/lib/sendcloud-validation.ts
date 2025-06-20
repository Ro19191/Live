export function sanitizeString(input: string | undefined | null, maxLength?: number): string {
  if (input === undefined || input === null) return ""
  let sanitized = String(input).trim()
  if (maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  return sanitized
}

export function validateEmail(email: string | undefined | null): string {
  const sanitizedEmail = sanitizeString(email).toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!sanitizedEmail || !emailPattern.test(sanitizedEmail)) {
    throw new Error(`Invalid email format: "${email}"`)
  }
  return sanitizedEmail
}

export function validatePostalCode(postalCode: string | undefined | null, country: string): string {
  // 1) Nettoyage basal
  const raw = sanitizeString(postalCode)
  if (!raw) throw new Error("Postal code is required.")

  // 2) Normalisation : on retire espaces/tirets, on passe en MAJ
  const cleaned = raw.replace(/[\s-]/g, "").toUpperCase()

  // 3) Table des regex Sendcloud (toujours SANS espace)
  const patterns: Record<string, RegExp> = {
    FR: /^\d{5}$/, // 75001
    BE: /^\d{4}$/, // 1000
    DE: /^\d{5}$/, // 12345
    NL: /^\d{4}[A-Z]{2}$/, // 1234AB
    GB: /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/, // SW1A1AA  (sans espace)
  }

  const cc = country.toUpperCase()
  const pattern = patterns[cc]

  if (pattern && !pattern.test(cleaned)) {
    throw new Error(`Postal code "${raw}" invalid for country ${cc}. ` + `Expected pattern: ${pattern.toString()}.`)
  }
  if (!pattern && (cleaned.length < 2 || cleaned.length > 10)) {
    throw new Error(`Postal code "${raw}" length invalid for country ${cc} (2-10 chars).`)
  }

  return cleaned
}

export function validateCountryCode(countryCode: string | undefined | null): string {
  const sanitizedCC = sanitizeString(countryCode, 2).toUpperCase()
  const isoPattern = /^[A-Z]{2}$/
  if (!sanitizedCC || !isoPattern.test(sanitizedCC)) {
    // If the input was empty and defaulted, this error message might be confusing.
    // The processField logic handles the default before calling this.
    throw new Error(`Invalid country code: "${countryCode}" (sanitized: "${sanitizedCC}"). Expected 2-letter ISO code.`)
  }
  return sanitizedCC
}

export function validatePhoneNumber(phone: string | undefined | null, countryCode = "FR"): string {
  if (!phone) return ""
  let sanitizedPhone = String(phone)
    .trim()
    .replace(/[\s\-()]/g, "")

  if (countryCode.toUpperCase() === "FR") {
    if (sanitizedPhone.startsWith("0")) {
      sanitizedPhone = `+33${sanitizedPhone.substring(1)}`
    } else if (!sanitizedPhone.startsWith("+33") && /^\d{9}$/.test(sanitizedPhone)) {
      // e.g. 612345678
      sanitizedPhone = `+33${sanitizedPhone}`
    }
  }
  // Add other country specific normalizations here if needed

  const e164Pattern = /^\+\d{9,15}$/ // Basic E.164 check
  if (!e164Pattern.test(sanitizedPhone)) {
    // Log a warning but don't throw, as Sendcloud might be more lenient or have other parsing.
    // However, this is a high-risk field for "pattern mismatch".
    console.warn(
      `Phone number "${phone}" (processed as "${sanitizedPhone}") for country ${countryCode} may not be in E.164 format. Sendcloud might reject it.`,
    )
    // To be stricter and find the error:
    // throw new Error(`Phone number "${phone}" (processed: "${sanitizedPhone}") does not match expected E.164-like pattern for country ${countryCode}.`);
  }
  return sanitizeString(sanitizedPhone, 35) // Apply general sanitization and length cap
}

export function validateServicePointId(id: string | number | undefined | null): number {
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new Error("Service point ID is required.")
  }
  const numId = Number(id)
  if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
    throw new Error(`Invalid service point ID: "${id}". Must be a positive integer.`)
  }
  return numId
}

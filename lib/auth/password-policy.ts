export const AUTH_MIN_PASSWORD_LENGTH = 10

export function validatePasswordPolicy(password: string) {
  const checks = {
    length: password.length >= AUTH_MIN_PASSWORD_LENGTH,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length
  const label = score >= 5 ? 'Strong' : score >= 4 ? 'Good' : score >= 3 ? 'Fair' : 'Weak'

  return {
    checks,
    score,
    label,
    isValid: Object.values(checks).every(Boolean),
  }
}

export function getPasswordPolicyMessage(password: string) {
  const policy = validatePasswordPolicy(password)
  if (policy.isValid) return null

  return `Use ${AUTH_MIN_PASSWORD_LENGTH}+ characters with uppercase, lowercase, number, and symbol.`
}

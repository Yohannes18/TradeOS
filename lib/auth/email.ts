type ResetPasswordPayload = {
  email: string
  name?: string | null
  resetUrl: string
}

type VerificationEmailPayload = {
  email: string
  name?: string | null
  verificationUrl: string
}

type VerificationOtpPayload = {
  email: string
  otp: string
  type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'
}

async function sendEmailThroughResend(payload: {
  to: string
  subject: string
  html: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.AUTH_FROM_EMAIL

  if (!resendApiKey || !fromEmail) {
    return false
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!response.ok) {
    throw new Error(`Resend email failed with status ${response.status}`)
  }

  return true
}

export async function sendResetPasswordEmail({ email, name, resetUrl }: ResetPasswordPayload) {
  const webhookUrl = process.env.BETTER_AUTH_EMAIL_WEBHOOK_URL

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'reset-password',
        app: 'TradeOS',
        to: email,
        name,
        resetUrl,
        subject: 'Reset your TradeOS password',
      }),
    })

    if (!response.ok) {
      throw new Error(`Reset email webhook failed with status ${response.status}`)
    }

    return
  }

  const sentWithResend = await sendEmailThroughResend({
    to: email,
    subject: 'Reset your TradeOS password',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>Reset your password</h2>
        <p>${name ? `Hi ${name},` : 'Hi,'}</p>
        <p>Use the button below to reset your TradeOS password.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#6b8cff;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })

  if (!sentWithResend) {
    console.warn(
      '[auth] No email transport configured. Password reset link generated for:',
      email,
      resetUrl,
    )
  }
}

export async function sendVerificationEmail({
  email,
  name,
  verificationUrl,
}: VerificationEmailPayload) {
  const webhookUrl = process.env.BETTER_AUTH_EMAIL_WEBHOOK_URL

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'verify-email',
        app: 'TradeOS',
        to: email,
        name,
        verificationUrl,
        subject: 'Verify your TradeOS email address',
      }),
    })

    if (!response.ok) {
      throw new Error(`Verification email webhook failed with status ${response.status}`)
    }

    return
  }

  const sentWithResend = await sendEmailThroughResend({
    to: email,
    subject: 'Verify your TradeOS email address',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>Verify your email</h2>
        <p>${name ? `Hi ${name},` : 'Hi,'}</p>
        <p>Use the link below to verify your TradeOS email address.</p>
        <p><a href="${verificationUrl}" style="display:inline-block;background:#6b8cff;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;">Verify email</a></p>
      </div>
    `,
  })

  if (!sentWithResend) {
    console.warn(
      '[auth] No email transport configured. Verification link generated for:',
      email,
      verificationUrl,
    )
  }
}

export async function sendVerificationOtpEmail({ email, otp, type }: VerificationOtpPayload) {
  const webhookUrl = process.env.BETTER_AUTH_EMAIL_WEBHOOK_URL

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'verify-email-otp',
        app: 'TradeOS',
        to: email,
        otp,
        otpType: type,
        subject: 'Your TradeOS verification code',
      }),
    })

    if (!response.ok) {
      throw new Error(`Verification OTP webhook failed with status ${response.status}`)
    }

    return
  }

  const typeLabel =
    type === 'email-verification'
      ? 'email verification'
      : type === 'sign-in'
        ? 'sign in'
        : type === 'forget-password'
          ? 'password reset'
          : 'email change'

  const sentWithResend = await sendEmailThroughResend({
    to: email,
    subject: 'Your TradeOS verification code',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>Your verification code</h2>
        <p>Use this code to complete your ${typeLabel} request.</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:8px;padding:16px 0;">${otp}</div>
        <p>This code will expire in a few minutes.</p>
      </div>
    `,
  })

  if (!sentWithResend) {
    console.warn(
      '[auth] No email transport configured. Verification OTP generated for:',
      email,
      otp,
      type,
    )
  }
}

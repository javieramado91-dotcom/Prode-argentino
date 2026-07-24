// Envío de emails de la app vía Gmail SMTP (el mismo que usás en Supabase).
// A diferencia de Resend en modo prueba, Gmail puede enviar a CUALQUIER
// destinatario. Es defensivo: si faltan las variables de entorno, no envía y
// NO rompe la operación que lo llamó (aprobar usuario, etc.).
//
// Configurar en Vercel → Settings → Environment Variables:
//   GMAIL_USER          = tu-cuenta@gmail.com   (la misma del SMTP de Supabase)
//   GMAIL_APP_PASSWORD  = la contraseña de aplicación de 16 letras (sin espacios)
//   MAIL_FROM_NAME      = Prode Argentino        (opcional)

import nodemailer from 'nodemailer'

const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Prode Argentino'

export function mailerConfigured(): boolean {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD)
}

export async function sendMail(opts: {
  to: string
  subject: string
  html: string
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  if (!mailerConfigured()) {
    console.warn('sendMail: GMAIL_USER / GMAIL_APP_PASSWORD sin configurar, se omite el envío.')
    return { sent: false, skipped: true }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })

    await transporter.sendMail({
      from: `${FROM_NAME} <${GMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    return { sent: true }
  } catch (err: any) {
    console.error('sendMail error:', err?.message || err)
    return { sent: false, error: err?.message || 'error desconocido' }
  }
}

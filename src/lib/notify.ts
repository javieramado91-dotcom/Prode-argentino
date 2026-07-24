// Avisos por email de la app. Se envían por Gmail SMTP (ver lib/mailer.ts),
// que puede enviar a cualquier destinatario. Todo es defensivo: si el mailer
// no está configurado, no se envía nada y NO rompe el registro ni la aprobación.

import { sendMail } from './mailer'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'javieramado91@gmail.com'
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://prode-argentino.vercel.app'

// Aviso al ADMIN de que hay una nueva solicitud de registro para aprobar.
export async function notifyAdminNewUser(newUserEmail: string) {
  await sendMail({
    to: ADMIN_EMAIL,
    subject: '⚽ Nueva solicitud de registro en el Prode',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#009ee3">Nueva solicitud de registro</h2>
        <p>Un nuevo usuario se registró en el Prode Argentino y está esperando tu aprobación:</p>
        <p style="font-size:18px;font-weight:bold">${newUserEmail}</p>
        <p>
          <a href="${APP_URL}/admin"
             style="display:inline-block;background:#009ee3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">
            Ir al panel de administrador
          </a>
        </p>
        <p style="color:#94a3b8;font-size:13px">Desde ahí podés aprobarlo o eliminarlo.</p>
      </div>
    `,
  })
}

// Aviso al USUARIO de que su cuenta fue aprobada y ya puede ingresar.
export async function notifyUserApproved(userEmail: string, displayName?: string | null) {
  const name = displayName?.trim() || 'crack'
  await sendMail({
    to: userEmail,
    subject: '✅ ¡Tu cuenta del Prode fue aprobada!',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#009ee3">¡Ya sos parte del Prode! ⚽</h2>
        <p>Hola <strong>${name}</strong>, el administrador aprobó tu cuenta. Ya podés
        iniciar sesión y empezar a cargar tus pronósticos.</p>
        <p>
          <a href="${APP_URL}/login"
             style="display:inline-block;background:#009ee3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">
            Entrar al Prode
          </a>
        </p>
        <p style="color:#94a3b8;font-size:13px">¡Suerte con los pronósticos!</p>
      </div>
    `,
  })
}

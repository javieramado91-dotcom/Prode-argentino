// Envío de emails de aviso al administrador (vía Resend).
// Es defensivo: si no está configurada la API key, no hace nada y NO rompe
// el registro. Para activarlo: crear una cuenta gratis en resend.com con el
// email del admin y poner RESEND_API_KEY en las variables de entorno.

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'javieramado91@gmail.com'
// El remitente onboarding@resend.dev del plan gratuito solo puede enviar al
// email de la propia cuenta de Resend (por eso conviene crearla con el del admin).
const FROM = process.env.RESEND_FROM || 'Prode Argentino <onboarding@resend.dev>'

export async function notifyAdminNewUser(newUserEmail: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // sin configurar: se ignora en silencio

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [ADMIN_EMAIL],
        subject: '⚽ Nueva solicitud de registro en el Prode',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#009ee3">Nueva solicitud de registro</h2>
            <p>Un nuevo usuario se registró en el Prode Argentino y está esperando tu aprobación:</p>
            <p style="font-size:18px;font-weight:bold">${newUserEmail}</p>
            <p>
              <a href="https://prode-argentino.vercel.app/admin"
                 style="display:inline-block;background:#009ee3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">
                Ir al panel de administrador
              </a>
            </p>
            <p style="color:#94a3b8;font-size:13px">Desde ahí podés aprobarlo o eliminarlo.</p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('notifyAdminNewUser:', err)
  }
}

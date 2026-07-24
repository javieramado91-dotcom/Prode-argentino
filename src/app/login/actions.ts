'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { notifyAdminNewUser } from '@/lib/notify'

// Limpia cualquier error técnico de Supabase antes de mostrarlo al usuario.
function sanitizeError(err: any, fallback: string): string {
  let msg = ''
  if (typeof err === 'string') msg = err
  else if (err && typeof err.message === 'string') msg = err.message
  if (!msg || msg === '[]' || msg === '{}' || msg === '[object Object]' || msg.trim() === '') {
    return fallback
  }
  if (err?.status === 500 || err?.__isAuthError) return fallback
  return msg
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    const msg = sanitizeError(error, 'Email o contraseña incorrectos. Verificá tus datos e intentá nuevamente.')
    redirect(`/login?mode=login&error=true&message=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const emailRaw = (formData.get('email') as string || '').trim().toLowerCase()
  const password = formData.get('password') as string
  const displayName = ((formData.get('display_name') as string) || '').trim()

  // El nombre de usuario es obligatorio: permite identificar a cada persona
  // en el panel de admin y en los rankings.
  if (displayName.length < 2) {
    redirect(`/login?mode=register&error=true&message=${encodeURIComponent('Ingresá un nombre de usuario (mínimo 2 caracteres).')}`)
  }

  const data = {
    email: emailRaw,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    let msg = sanitizeError(error, 'No se pudo crear la cuenta. Intentá de nuevo en unos segundos.')
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique constraint')) {
      msg = 'Ese email ya está registrado. Podés iniciar sesión o solicitar recuperar tu clave.'
    }
    redirect(`/login?mode=register&error=true&message=${encodeURIComponent(msg)}`)
  }

  // Avisar al administrador por email de la nueva solicitud
  await notifyAdminNewUser(emailRaw)

  revalidatePath('/', 'layout')
  redirect('/pending-approval')
}

export async function resetPasswordAction(email: string) {
  const supabase = await createClient()

  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail) {
    return { error: 'Ingresá tu correo electrónico.' }
  }

  // Usar la URL de sitio configurada via env, o la URL de producción hardcodeada.
  // NO usar el header `origin` porque en Vercel puede ser una URL de preview deployment
  // que no está en la lista de Redirect URLs de Supabase.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://prode-argentino.vercel.app'

  const redirectTo = `${siteUrl}/reset`

  let result: any = null
  try {
    result = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })
  } catch (e: any) {
    return { error: 'No se pudo conectar con el servidor de autenticación. Intentá nuevamente.' }
  }

  const { error } = result

  if (error) {
    const status = (error as any)?.status
    const raw = typeof (error as any)?.message === 'string' ? (error as any).message : ''

    if (status === 429 || raw.toLowerCase().includes('rate limit') || raw.toLowerCase().includes('email rate')) {
      return { error: 'Demasiados intentos. Esperá unos minutos antes de solicitar otro correo.' }
    }
    if (raw.toLowerCase().includes('redirect')) {
      return { error: `La URL de redirección "${redirectTo}" no está permitida en Supabase. Agregala en Authentication → URL Configuration → Redirect URLs.` }
    }
    // Cualquier otro error (incluido status 500 con mensaje vacío / "{}" / "[]")
    return { error: `No se pudo enviar el correo de recuperación. (${raw || `error ${status || 'desconocido'}`}) — Verificá que el email esté registrado en el sistema.` }
  }

  return { success: true }
}


'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

  const data = {
    email: emailRaw,
    password,
    options: {
      data: {
        display_name: emailRaw.split('@')[0]
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

  const h = await headers()
  const origin = h.get('origin') || `https://${h.get('host') || 'prode-argentino.vercel.app'}`

  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail) {
    return { error: 'Ingresá tu correo electrónico.' }
  }

  let result: any = null
  try {
    result = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${origin}/reset`
    })
  } catch (e: any) {
    return { error: 'No se pudo conectar con el servidor de autenticación. Intentá nuevamente.' }
  }

  const { error } = result

  if (error) {
    const status = (error as any)?.status
    const raw = (error as any)?.message || ''

    if (status === 500 || (error as any).__isAuthError) {
      return { error: 'El servidor de Supabase no pudo procesar la solicitud (error 500). Verificá en Supabase → Authentication → URL Configuration que la URL "' + origin + '/reset" esté en la lista de Redirect URLs permitidas.' }
    }
    if (raw.includes('redirect')) {
      return { error: 'La URL de redirección no está permitida. Agregá "' + origin + '/reset" en Supabase → Authentication → URL Configuration → Redirect URLs.' }
    }
    if (status === 429 || raw.includes('rate limit')) {
      return { error: 'Demasiados intentos. Esperá unos minutos antes de solicitar otro correo.' }
    }
    return { error: sanitizeError(error, 'No se pudo enviar el correo. Verificá tu email e intentá de nuevo.') }
  }

  return { success: true }
}


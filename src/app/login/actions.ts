'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notifyAdminNewUser } from '@/lib/notify'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?mode=login&error=true&message=${encodeURIComponent(error.message)}`)
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
    let msg = error.message
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

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${origin}/reset`
  })

  if (error) {
    let msg = error.message || ''
    if (msg.includes('redirect_to') || msg.includes('redirect')) {
      msg = 'La URL de redirección no está permitida en Supabase. Agregá ' + origin + '/reset en Supabase -> Authentication -> URL Configuration -> Redirect URLs.'
    } else if (msg.includes('rate limit') || (error as any)?.status === 429) {
      msg = 'Superaste el límite de envíos por hora de Supabase. Aguardá unos minutos e intentá nuevamente.'
    } else if (!msg || msg === '[]' || msg === '{}' || (error as any)?.status === 500) {
      msg = 'No se pudo enviar el correo de recuperación. Verificá que la casilla esté registrada correctamente o que la URL /reset esté autorizada en Supabase.'
    }
    return { error: msg }
  }

  return { success: true }
}

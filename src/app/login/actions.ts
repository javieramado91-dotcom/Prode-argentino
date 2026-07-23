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

  // El enlace del mail de confirmación debe volver al dominio desde el que se
  // registró el usuario (producción o local), nunca a un localhost ajeno.
  const h = await headers()
  const origin = h.get('origin') || `https://${h.get('host') || 'prode-argentino.vercel.app'}`

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        display_name: (formData.get('email') as string).split('@')[0]
      },
      emailRedirectTo: `${origin}/login?info=${encodeURIComponent(
        'Email confirmado. Ya podés iniciar sesión.'
      )}`
    }
  }

  const { data: signUpData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/login?mode=register&error=true&message=${encodeURIComponent(error.message)}`)
  }

  // Avisar al administrador por email (no bloquea el registro si falla).
  await notifyAdminNewUser(data.email)

  // Si Supabase exige confirmar el email, no hay sesión todavía: avisar claro.
  if (!signUpData.session) {
    redirect(
      `/login?mode=login&info=${encodeURIComponent(
        'Cuenta creada. Revisá tu correo y confirmá la cuenta; después iniciá sesión acá.'
      )}`
    )
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

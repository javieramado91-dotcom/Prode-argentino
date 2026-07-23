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

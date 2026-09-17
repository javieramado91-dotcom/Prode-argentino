import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  await supabase.auth.signOut()

  // 303, no 307. `redirect()` de next/navigation responde 307 fuera de una
  // Server Action, y el 307 PRESERVA el método: el navegador volvía a hacer
  // POST contra "/", que no tiene handler POST, y el usuario terminaba en un
  // 405 después de cerrar sesión. El 303 obliga a seguir con GET.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}

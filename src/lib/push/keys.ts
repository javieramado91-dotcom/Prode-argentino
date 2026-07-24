// Clave VAPID PÚBLICA de Web Push.
//
// Es pública por diseño (viaja al navegador para crear la suscripción), así que
// es seguro dejarla como valor por defecto —igual que la anon key de Supabase—.
// La clave PRIVADA correspondiente NUNCA va acá: se lee solo del servidor
// (VAPID_PRIVATE_KEY). Si cambiás una, tenés que cambiar la otra (son un par).
//
// Este archivo NO importa `web-push`, así que se puede importar desde cualquier
// lado (incluida una página server que le pasa la clave a un componente cliente).
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKmQ67yCw0fGSXSv0WpsZLjxPXnizsFtfInV7eb5JBqWV8n479zM5CnEldse-YcRUlzTb5Pl7P36bHAiJ5ZYOc8'

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:javieramado91@gmail.com'

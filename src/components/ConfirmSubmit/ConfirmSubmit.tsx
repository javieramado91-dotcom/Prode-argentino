'use client'

// Botón de submit que pide confirmación antes de enviar el formulario.
// Para acciones irreversibles (eliminar un usuario borra también sus
// pronósticos, sus membresías y su cuenta de auth).
export default function ConfirmSubmit({
  message,
  children,
  className,
  style,
}: {
  message: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}

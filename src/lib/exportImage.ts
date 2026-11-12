'use client'

import html2canvas from 'html2canvas'

// Captura un nodo (montado fuera de pantalla) y lo descarga como JPG.
export async function downloadNodeAsJpg(
  node: HTMLElement,
  filename: string,
  size: { width: number; height?: number } = { width: 1080 }
): Promise<void> {
  const canvas = await html2canvas(node, {
    backgroundColor: '#060c18',
    scale: 1,
    width: size.width,
    height: size.height,
    windowWidth: size.width,
    windowHeight: size.height,
    useCORS: true,
    logging: false,
  })
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear el JPG'))), 'image/jpeg', 0.93)
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'prode'
  )
}

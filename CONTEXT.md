# Proyecto: Prode del Fútbol Argentino

## Ubicación del Proyecto
- **Directorio Activo (Workspace):** `C:\Users\Gaspar\.gemini\antigravity\scratch\prode-argentina`
- **Stack Tecnológico:** Next.js (App Router), Vanilla CSS, Supabase Pro (para Base de Datos y Autenticación).
- **Diseño:** Moderno, modo oscuro, efecto glassmorphism, UI "premium" (no se debe utilizar Tailwind).

## Objetivo Principal
Construir una aplicación web estilo "Prode" (como el de Mercado Pago) para la Liga Profesional del Fútbol Argentino. Los resultados deben actualizarse de forma automática y los pronósticos de los usuarios se deben bloquear exactamente a la hora de inicio de cada partido.

## Reglas de Puntuación (Estilo Mercado Pago)
- **6 puntos:** Por acertar el resultado exacto.
- **3 puntos:** Por acertar el ganador o empate, pero fallando el resultado exacto.
- **0 puntos:** Si no se acierta nada.

## Estado Actual
- [x] Aplicación Next.js instalada e inicializada.
- [x] Repositorio Git local creado.
- [x] Estilos base globales y tipografías (Outfit) configuradas en `src/app/globals.css`.
- [x] Estructura inicial de la Landing Page construida en `src/app/page.tsx`.

## Siguientes Tareas a Ejecutar por el Agente
Por favor, continúa el desarrollo siguiendo estos pasos (puedes actualizar un archivo `task.md` para hacer seguimiento):
1. **Supabase:** Conectar el cliente de Supabase y proponer el esquema de tablas (usuarios, partidos, predicciones, grupos).
2. **Autenticación:** Implementar la pantalla de registro / inicio de sesión.
3. **UI/Componentes:** Crear componentes base reutilizables (tarjetas de partidos, inputs de resultados).
4. **API de Fútbol:** Crear los servicios para consumir una API de fútbol gratuita y mapear los datos a la base de datos.

---
**Instrucción para el Agente:** 
Lee este documento, revisa el archivo `src/app/page.tsx` para entender el diseño base, y comienza ejecutando el **Paso 1** (Configuración de Supabase).

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9df0d39d-33ec-4626-9c62-c548910a9de2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Novedades del sistema

Las mejoras visibles en el Manager se editan en `src/data/systemUpdates.ts`.

Para publicar una nueva notificacion:

1. Agrega una entrada nueva al inicio del arreglo `systemUpdates`.
2. Usa un `id` unico, por ejemplo `2026-06-23-nombre-del-cambio`.
3. Actualiza `version`, `releasedAt`, `title`, `summary` y `highlights`.
4. Ejecuta el deploy normalmente.

Cuando el usuario entre al Manager, vera un aviso si la ultima entrada aun no fue leida en ese navegador.

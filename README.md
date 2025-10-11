## LecSum AI — Frontend

### Propósito
LecSum AI permite a sus usuarios crear flashcards y quizzes con IA, y conversar con una IA sobre los documentos que suban.

### Tech Stack
- Next.js
- Tailwind CSS v4
- NestJS
- PostgreSQL
- OpenAI
- Gemini

### Cómo ejecutarlo localmente
1) Instalar dependencias:
	- `npm install`
2) Ejecutar en desarrollo:
	- `npm run dev` y abrir http://localhost:3000

Para funcionalidades completas, asegúrate de tener el backend corriendo en local. Repositorio del backend: https://github.com/BrunoChampionGalvez/lecsum-ai-backend

### Configuración rápida (.env)
- Archivo: crea `lecsum-ai-frontend/.env.local` (puedes guiarte con `.env.example`).
- Variables:
  - `NEXT_PUBLIC_API_URL`: URL base del backend que consumirá el frontend.
	 - Ejemplo local: `http://localhost:3001`
	 - Producción (Vercel): define esta variable en las Variables de Entorno del proyecto.

### URL de acceso
Frontend en producción: https://lecsum-ai-frontend.vercel.app/

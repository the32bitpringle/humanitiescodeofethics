# Humanity's Code of Ethics

A collaborative, AI-moderated ethical code for humanity.

## Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run in Dev Mode**:
   ```bash
   npm run dev
   ```
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:3001](http://localhost:3001)

## Deployment (Render)

This project is optimized for deployment as a **Web Service** on Render.

### 1. Create a Web Service
- **Runtime**: Node
- **Build Command**: `npm run build:render`
- **Start Command**: `npm run server`

### 2. Environment Variables
Add the following in the Render dashboard:
- `GROQ_API_KEY`: Your Groq API Key.
- `DATABASE_URL`: Your PostgreSQL connection string (Supabase/Neon).
- `NODE_ENV`: `production`

## Architecture
- **Frontend**: React (TypeScript)
- **Backend**: Express.js
- **Database**: PostgreSQL (Cloud)
- **AI**: Groq (Llama 3.3)

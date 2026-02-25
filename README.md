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
- `NODE_ENV`: `production`
- `DATABASE_PATH`: (Optional) `/var/data/database.sqlite` if using a persistent disk.

### 3. Persistent Disk (Recommended)
If you want to keep the history after the service restarts:
1. Go to **Disks** in your Render service settings.
2. Add a disk with **Mount Path** set to `/var/data`.
3. Ensure `DATABASE_PATH` environment variable is set to `/var/data/database.sqlite`.

## Architecture
- **Frontend**: React (TypeScript)
- **Backend**: Express.js
- **Database**: SQLite
- **AI**: Groq (Llama 3.3)

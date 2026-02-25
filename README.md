# Humanity's Code of Ethics - Local Development

This project has been optimized for local development. Hosting-specific configurations (Vercel, Netlify, Docker) have been removed.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   The server uses a Groq API key for AI review. It is currently hardcoded in `server/index.js` but should ideally be moved to a `.env` file.

## Running the Application

### Option 1: Development Mode (Recommended)
This starts both the React development server (with hot-reloading) and the Node.js backend server.
```bash
npm run dev
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)

### Option 2: Production Mode (Local)
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the unified server:
   ```bash
   npm run server
   ```
The application will be available at [http://localhost:3001](http://localhost:3001).

## Architecture
- **Frontend**: React (TypeScript) bootstrapped with CRA.
- **Backend**: Express.js server in `server/index.js`.
- **Database**: SQLite (stored in `database.sqlite`).
- **AI**: Groq SDK (Llama 3) for ethics review.

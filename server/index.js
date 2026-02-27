const express = require('express');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for many cloud providers like Supabase/Neon
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../build')));

// Database Initialization
const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS article (
                id SERIAL PRIMARY KEY,
                current_content TEXT,
                last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS history (
                id SERIAL PRIMARY KEY,
                content TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                change_description TEXT,
                vetoes TEXT DEFAULT '[]', -- JSON stringified array
                reversed BOOLEAN DEFAULT FALSE
            );
        `);

        // Initial Seed
        const res = await client.query('SELECT * FROM article LIMIT 1');
        if (res.rows.length === 0) {
            const INITIAL_ARTICLE = `Humanity's Code of Ethics

1. Do no harm to the collective or the individual.
2. Foster knowledge and the pursuit of truth.
3. Preserve the environment that sustains life.
4. Respect the autonomy and dignity of all sentient beings.
5. Seek progress through cooperation and empathy.`;
            
            await client.query('INSERT INTO article (current_content) VALUES ($1)', [INITIAL_ARTICLE]);
            await client.query('INSERT INTO history (content, change_description, vetoes) VALUES ($1, $2, $3)', 
                [INITIAL_ARTICLE, 'Initial Version', '[]']);
        }
    } catch (err) {
        console.error('Database initialization error:', err);
    } finally {
        client.release();
    }
};

initDb();

// API Routes
app.get('/api/article', async (req, res) => {
    try {
        const result = await pool.query('SELECT current_content FROM article LIMIT 1');
        res.json({ content: result.rows[0].current_content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM history ORDER BY id ASC');
        const parsedHistory = result.rows.map(h => ({
            ...h,
            content: h.content,
            timestamp: h.timestamp,
            changeDescription: h.change_description,
            vetoes: JSON.parse(h.vetoes || '[]'),
            reversed: !!h.reversed
        }));
        res.json(parsedHistory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/edit', async (req, res) => {
    const { newContent, changeDescription } = req.body;
    
    try {
        const articleRes = await pool.query('SELECT current_content FROM article LIMIT 1');
        const currentContent = articleRes.rows[0].current_content;
        
        const prompt = `Task: Analyze the 'Proposed Text' and determine if it is a contextual and coherent continuation of the 'Original Text'.

Rules:
1. REJECT if the 'Proposed Text' contains nonsense, gibberish, or random characters (e.g., "ls;dkhflakdjfha").
2. REJECT if the 'Proposed Text' is clearly off-topic from the 'Original Text' (e.g., talking about food, cars, or sports when the original is about ethics).
3. APPROVE if the 'Proposed Text' is a coherent, on-topic attempt to modify the 'Original Text'. Your only job is to filter for context, not correctness or morality.

Original Text (a code of ethics):
${currentContent}

Proposed Text:
${newContent}

Is the 'Proposed Text' a valid, on-topic, and coherent modification based *only* on the rules above?

Respond ONLY with a JSON object: { "success": boolean, "message": "Reason for approval or rejection based on context and coherence." }`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(chatCompletion.choices[0].message.content);

        if (result.success) {
            await pool.query('UPDATE article SET current_content = $1, last_update = CURRENT_TIMESTAMP', [newContent]);
            await pool.query('INSERT INTO history (content, change_description, vetoes) VALUES ($1, $2, $3)', 
                [newContent, changeDescription, '[]']);
            res.json({ success: true });
        } else {
            res.json({ success: false, message: result.message });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'AI Review failed' });
    }
});

app.post('/api/veto', async (req, res) => {
    const { entryId, userId } = req.body;
    
    try {
        const entryRes = await pool.query('SELECT * FROM history WHERE id = $1', [entryId]);
        const entry = entryRes.rows[0];
        
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        
        let vetoes = JSON.parse(entry.vetoes || '[]');
        if (!vetoes.includes(userId)) {
            vetoes.push(userId);
        }
        
        await pool.query('UPDATE history SET vetoes = $1 WHERE id = $2', [JSON.stringify(vetoes), entryId]);
        
        if (vetoes.length >= 2) {
            await pool.query('UPDATE history SET reversed = TRUE WHERE id = $1', [entryId]);
            
            const prevRes = await pool.query('SELECT content FROM history WHERE reversed = FALSE ORDER BY id DESC LIMIT 1');
            if (prevRes.rows[0]) {
                await pool.query('UPDATE article SET current_content = $1, last_update = CURRENT_TIMESTAMP', [prevRes.rows[0].content]);
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

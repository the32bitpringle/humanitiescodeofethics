const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(bodyParser.json());
// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, '../build')));

// SQLite Connection
let db;
(async () => {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');
    
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS article (
            id INTEGER PRIMARY KEY,
            currentContent TEXT,
            lastUpdate DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            changeDescription TEXT,
            vetoes TEXT, -- JSON stringified array
            reversed INTEGER DEFAULT 0
        );
    `);

    // Initial Seed
    const article = await db.get('SELECT * FROM article LIMIT 1');
    if (!article) {
        const INITIAL_ARTICLE = `Humanity's Code of Ethics

1. Do no harm to the collective or the individual.
2. Foster knowledge and the pursuit of truth.
3. Preserve the environment that sustains life.
4. Respect the autonomy and dignity of all sentient beings.
5. Seek progress through cooperation and empathy.`;
        
        await db.run('INSERT INTO article (currentContent) VALUES (?)', [INITIAL_ARTICLE]);
        await db.run('INSERT INTO history (content, changeDescription, vetoes) VALUES (?, ?, ?)', 
            [INITIAL_ARTICLE, 'Initial Version', '[]']);
    }
})();

// API Routes
app.get('/api/article', async (req, res) => {
    try {
        const article = await db.get('SELECT currentContent FROM article LIMIT 1');
        res.json({ content: article.currentContent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const history = await db.all('SELECT * FROM history');
        const parsedHistory = history.map(h => ({
            ...h,
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
        const article = await db.get('SELECT currentContent FROM article LIMIT 1');
        
        const prompt = `Review this proposed change to 'Humanity's Code of Ethics'.
Current Code:
${article.currentContent}

Proposed New Code:
${newContent}

Reason for change: ${changeDescription}

Determine if this change is ethical, constructive, and aligned with the goal of improving humanity's well-being.
Respond ONLY with a JSON object: { "success": boolean, "message": "Short explanation" }`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(chatCompletion.choices[0].message.content);

        if (result.success) {
            await db.run('UPDATE article SET currentContent = ?, lastUpdate = CURRENT_TIMESTAMP', [newContent]);
            await db.run('INSERT INTO history (content, changeDescription, vetoes) VALUES (?, ?, ?)', 
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
        const entry = await db.get('SELECT * FROM history WHERE id = ?', [entryId]);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        
        let vetoes = JSON.parse(entry.vetoes || '[]');
        if (!vetoes.includes(userId)) {
            vetoes.push(userId);
        }
        
        await db.run('UPDATE history SET vetoes = ? WHERE id = ?', [JSON.stringify(vetoes), entryId]);
        
        if (vetoes.length >= 2) {
            // Revert logic: Find the most recent non-reversed entry before this one
            await db.run('UPDATE history SET reversed = 1 WHERE id = ?', [entryId]);
            
            const previousEntry = await db.get('SELECT content FROM history WHERE reversed = 0 ORDER BY id DESC LIMIT 1');
            if (previousEntry) {
                await db.run('UPDATE article SET currentContent = ?, lastUpdate = CURRENT_TIMESTAMP', [previousEntry.content]);
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Handle React Routing
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

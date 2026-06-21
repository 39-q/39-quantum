const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const EXPLANATIONS_FILE = path.join(__dirname, 'explanations.json');
const RESEARCH_FILE = path.join(__dirname, 'research.json');

// Helper: Read JSON file
function readJSON(file) {
    try {
        if (!fs.existsSync(file)) return [];
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Helper: Write JSON file
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ========== EXPLANATIONS ==========

app.get('/api/explanations', (req, res) => {
    try {
        const data = readJSON(EXPLANATIONS_FILE);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load explanations' });
    }
});

app.get('/api/explanations/:id', (req, res) => {
    try {
        const data = readJSON(EXPLANATIONS_FILE);
        const id = Number(req.params.id);
        const item = data.find(e => e.id === id);
        if (!item) {
            return res.status(404).json({ error: 'Explanation not found' });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load explanation' });
    }
});

app.post('/api/explanations', (req, res) => {
    try {
        const { title, arxiv_id, paper_id, content, author } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const data = readJSON(EXPLANATIONS_FILE);
        const newItem = {
            id: Date.now(),
            title,
            arxiv_id: arxiv_id || null,
            paper_id: paper_id || null,
            content,
            author: author || 'Anonymous',
            timestamp: new Date().toISOString(),
            upvotes: 0,
            comments: []
        };
        data.unshift(newItem);
        writeJSON(EXPLANATIONS_FILE, data);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save explanation' });
    }
});

// ========== RESEARCH ==========

app.get('/api/research', (req, res) => {
    try {
        const data = readJSON(RESEARCH_FILE);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load research' });
    }
});

app.post('/api/research', (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet } = req.body;
        if (!title || !abstract) {
            return res.status(400).json({ error: 'Title and abstract are required' });
        }

        const data = readJSON(RESEARCH_FILE);
        const newItem = {
            id: Date.now(),
            title,
            authors: authors || 'Anonymous',
            institution: institution || '',
            abstract,
            fundingUrl: fundingUrl || null,
            authorWallet: authorWallet || null,
            contentHash: crypto.createHash('sha256').update(abstract).digest('hex').substring(0, 16),
            timestamp: new Date().toISOString(),
            views: 0
        };
        data.unshift(newItem);
        writeJSON(RESEARCH_FILE, data);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save research' });
    }
});

// ========== STATIC PAGES ==========

app.get('/explanations.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'explanations.html'));
});

app.get('/add-explanation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-explanation.html'));
});

app.get('/explanation/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'explanation.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== START ==========

app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
});

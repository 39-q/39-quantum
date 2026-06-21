const express = require('express');
const fs = require('fs').promises;
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const RESEARCH_FILE = path.join(__dirname, 'research.json');
const EXPLANATIONS_FILE = path.join(__dirname, 'explanations.json');

// Helper to read explanations
async function loadExplanations() {
    try {
        const data = await fs.readFile(EXPLANATIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Helper to save explanations
async function saveExplanations(explanations) {
    await fs.writeFile(EXPLANATIONS_FILE, JSON.stringify(explanations, null, 2));
}

// Helper to read research papers
async function loadResearch() {
    try {
        const data = await fs.readFile(RESEARCH_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Helper to save research papers
async function saveResearch(papers) {
    await fs.writeFile(RESEARCH_FILE, JSON.stringify(papers, null, 2));
}

// ========== EXPLANATIONS API ==========

// GET all explanations
app.get('/api/explanations', async (req, res) => {
    const explanations = await loadExplanations();
    res.json(explanations);
});

// GET a single explanation by ID
app.get('/api/explanations/:id', async (req, res) => {
    try {
        const explanations = await loadExplanations();
        const id = Number(req.params.id);
        const explanation = explanations.find(e => e.id === id);
        if (!explanation) {
            return res.status(404).json({ error: 'Explanation not found' });
        }
        res.json(explanation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load explanation' });
    }
});

// POST a new explanation
app.post('/api/explanations', async (req, res) => {
    try {
        const { title, arxiv_id, paper_id, content, author } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const explanations = await loadExplanations();
        const newExplanation = {
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
        explanations.unshift(newExplanation);
        await saveExplanations(explanations);
        res.status(201).json(newExplanation);
    } catch (error) {
        console.error('Error saving explanation:', error);
        res.status(500).json({ error: 'Failed to save explanation' });
    }
});

// ========== RESEARCH API ==========

app.get('/api/research', async (req, res) => {
    const papers = await loadResearch();
    res.json(papers);
});

app.post('/api/research', async (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet } = req.body;
        if (!title || !abstract) {
            return res.status(400).json({ error: 'Title and abstract are required' });
        }

        const papers = await loadResearch();
        const newPaper = {
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
        papers.unshift(newPaper);
        await saveResearch(papers);
        res.status(201).json(newPaper);
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

// ========== START SERVER ==========

app.listen(PORT, () => {
    console.log(`✅ 39 Quantum running on port ${PORT}`);
});

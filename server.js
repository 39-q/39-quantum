const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { yolodb } = require('yolodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize YoloDB tables
const explanations = yolodb('explanations.json', 'id', []);
const research = yolodb('research.json', 'id', []);

// ========== EXPLANATIONS ==========

// GET all explanations
app.get('/api/explanations', (req, res) => {
    try {
        const data = explanations.find({});
        res.json(data);
    } catch (error) {
        console.error('Error loading explanations:', error);
        res.status(500).json({ error: 'Failed to load explanations' });
    }
});

// GET a single explanation by ID
app.get('/api/explanations/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        const explanation = explanations.findById(id);
        if (!explanation) {
            return res.status(404).json({ error: 'Explanation not found' });
        }
        res.json(explanation);
    } catch (error) {
        console.error('Error loading explanation:', error);
        res.status(500).json({ error: 'Failed to load explanation' });
    }
});

// POST a new explanation
app.post('/api/explanations', (req, res) => {
    try {
        const { title, arxiv_id, paper_id, content, author } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

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
        explanations.insert(newExplanation);
        res.status(201).json(newExplanation);
    } catch (error) {
        console.error('Error saving explanation:', error);
        res.status(500).json({ error: 'Failed to save explanation' });
    }
});

// ========== RESEARCH PAPERS ==========

// GET all papers
app.get('/api/research', (req, res) => {
    try {
        const data = research.find({});
        res.json(data);
    } catch (error) {
        console.error('Error loading research:', error);
        res.status(500).json({ error: 'Failed to load research' });
    }
});

// POST a new paper
app.post('/api/research', (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet } = req.body;
        if (!title || !abstract) {
            return res.status(400).json({ error: 'Title and abstract are required' });
        }

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
        research.insert(newPaper);
        res.status(201).json(newPaper);
    } catch (error) {
        console.error('Error saving research:', error);
        res.status(500).json({ error: 'Failed to save research' });
    }
});

// GET a single paper by ID
app.get('/api/research/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        const paper = research.findById(id);
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        res.json(paper);
    } catch (error) {
        console.error('Error loading paper:', error);
        res.status(500).json({ error: 'Failed to load paper' });
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
    console.log(` 39 Quantum running on port ${PORT}`);
    console.log(` Data stored with YoloDB`);
});

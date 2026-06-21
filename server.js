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
    res.json(explanations.find());
});

// GET a single explanation by ID
app.get('/api/explanations/:id', (req, res) => {
    const id = Number(req.params.id);
    const explanation = explanations.findById(id);
    if (!explanation) {
        return res.status(404).json({ error: 'Explanation not found' });
    }
    res.json(explanation);
});

// POST a new explanation
app.post('/api/explanations', (req, res) => {
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
});

// ========== RESEARCH PAPERS ==========

// GET all papers
app.get('/api/research', (req, res) => {
    res.json(research.find());
});

// POST a new paper
app.post('/api/research', (req, res) => {
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
});

// GET a single paper by ID
app.get('/api/research/:id', (req, res) => {
    const id = Number(req.params.id);
    const paper = research.findById(id);
    if (!paper) {
        return res.status(404).json({ error: 'Paper not found' });
    }
    res.json(paper);
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
    console.log(`📝 Data stored with YoloDB`);
});

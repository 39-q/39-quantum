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

const DATA_FILE = path.join(__dirname, 'research-log.json');
const EXPLANATIONS_FILE = path.join(__dirname, 'explanations.json');

// Helper functions for explanations
async function loadExplanations() {
    try {
        const data = await fs.readFile(EXPLANATIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveExplanations(explanations) {
    await fs.writeFile(EXPLANATIONS_FILE, JSON.stringify(explanations, null, 2));
}

// GET all explanations
app.get('/api/explanations', async (req, res) => {
    try {
        const explanations = await loadExplanations();
        res.json(explanations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load explanations' });
    }
});

// POST a new explanation
app.post('/api/explanations', async (req, res) => {
    try {
        const { title, arxiv_id, content, author } = req.body;
        if (!arxiv_id || !title || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const explanations = await loadExplanations();
        const newExplanation = {
            id: Date.now(),
            title,
            arxiv_id,
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

// GET a single explanation by ID
app.get('/api/explanations/:id', async (req, res) => {
    try {
        const explanations = await loadExplanations();
        const explanation = explanations.find(e => e.id == req.params.id);
        if (!explanation) {
            return res.status(404).json({ error: 'Explanation not found' });
        }
        res.json(explanation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load explanation' });
    }
});

// Generate hash for thesis content
function generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// GET all research papers
app.get('/api/research', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        res.json(papers);
    } catch (error) {
        res.json([]);
    }
});

// POST a new research paper
app.post('/api/research', async (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet } = req.body;
        
        if (!title || !abstract) {
            return res.status(400).json({ error: 'Title and abstract are required' });
        }
        
        const paperId = Date.now();
        const contentHash = generateHash(abstract);
        
        const newPaper = {
            id: paperId,
            title,
            authors: authors || 'Anonymous',
            institution: institution || '',
            abstract,
            fundingUrl: fundingUrl || null,
            authorWallet: authorWallet || null,
            contentHash: contentHash,
            timestamp: new Date().toISOString(),
            views: 0
        };
        
        let papers = [];
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            papers = JSON.parse(data);
        } catch {}
        
        papers.unshift(newPaper);
        await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        
        res.status(201).json(newPaper);
    } catch (error) {
        console.error('Error saving research:', error);
        res.status(500).json({ error: 'Failed to save research' });
    }
});

// GET a single paper by ID
app.get('/api/research/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        const paper = papers.find(p => p.id == req.params.id);
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        res.json(paper);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load paper' });
    }
});

// Track paper views
app.post('/api/view/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        const paper = papers.find(p => p.id == req.params.id);
        if (paper) {
            paper.views = (paper.views || 0) + 1;
            await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track view' });
    }
});

// Serve static HTML pages
app.get('/explanations.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'explanations.html'));
});

app.get('/add-explanation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-explanation.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`\n 39 Quantum running on port ${PORT}`);
    console.log(` Research data: ${DATA_FILE}`);
    console.log(` Explanations data: ${EXPLANATIONS_FILE}`);
    console.log(` Read. Publish. Explain.`);
});

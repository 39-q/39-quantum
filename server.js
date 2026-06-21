const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ========== SUPABASE SETUP ==========
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ========== EXPLANATIONS ==========

// GET all explanations
app.get('/api/explanations', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('explanations')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error loading explanations:', error);
        res.status(500).json({ error: 'Failed to load explanations' });
    }
});

// GET a single explanation by ID
app.get('/api/explanations/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { data, error } = await supabase
            .from('explanations')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Explanation not found' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error loading explanation:', error);
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

        const newItem = {
            id: Date.now(),
            title,
            arxiv_id: arxiv_id || null,
            paper_id: paper_id || null,
            content,
            author: author || 'Anonymous',
            timestamp: new Date().toISOString(),
            upvotes: 0
        };

        const { data, error } = await supabase
            .from('explanations')
            .insert([newItem])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error saving explanation:', error);
        res.status(500).json({ error: 'Failed to save explanation' });
    }
});

// ========== RESEARCH PAPERS ==========

// GET all papers
app.get('/api/research', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('research')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error loading research:', error);
        res.status(500).json({ error: 'Failed to load research' });
    }
});

// POST a new paper
app.post('/api/research', async (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet } = req.body;
        if (!title || !abstract) {
            return res.status(400).json({ error: 'Title and abstract are required' });
        }

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

        const { data, error } = await supabase
            .from('research')
            .insert([newItem])
            .select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error saving research:', error);
        res.status(500).json({ error: 'Failed to save research' });
    }
});

// GET a single paper by ID
app.get('/api/research/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { data, error } = await supabase
            .from('research')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error loading paper:', error);
        res.status(500).json({ error: 'Failed to load paper' });
    }
});

// Track paper views
app.post('/api/view/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { error } = await supabase
            .from('research')
            .update({ views: supabase.rpc('increment', { row_id: id }) })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({ error: 'Failed to track view' });
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
    console.log(`✅ 39 Quantum running on port ${PORT}`);
    console.log(`📁 Database: Supabase`);
});

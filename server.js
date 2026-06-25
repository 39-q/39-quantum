const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple rate limiting
const rateLimits = {};

function checkRateLimit(address) {
    const now = Date.now();
    if (rateLimits[address] && (now - rateLimits[address]) < 30000) { // 30 seconds
        return false;
    }
    rateLimits[address] = now;
    return true;
}

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

        const authorAddress = author || 'anonymous';

        if (authorAddress !== 'anonymous' && !checkRateLimit(authorAddress)) {
            return res.status(429).json({ error: 'Too many posts. Please wait 30 seconds.' });
        }

        const newItem = {
            id: Date.now(),
            title,
            arxiv_id: arxiv_id || null,
            paper_id: paper_id || null,
            content,
            author: authorAddress,
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

        const walletAddress = authorWallet || 'anonymous';

        if (walletAddress !== 'anonymous' && !checkRateLimit(walletAddress)) {
            return res.status(429).json({ error: 'Too many posts. Please wait 30 seconds.' });
        }

        const newItem = {
            id: Date.now(),
            title,
            authors: authors || 'Anonymous',
            institution: institution || '',
            abstract,
            fundingUrl: fundingUrl || null,
            authorWallet: walletAddress,
            contentHash: require('crypto').createHash('sha256').update(abstract).digest('hex').substring(0, 16),
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
        const { data: current } = await supabase
            .from('research')
            .select('views')
            .eq('id', id)
            .single();
        
        const newViews = (current?.views || 0) + 1;
        const { error } = await supabase
            .from('research')
            .update({ views: newViews })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({ error: 'Failed to track view' });
    }
});

// ========== FORUM TOPICS ==========

// GET all topics
app.get('/api/topics', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error loading topics:', error);
        res.status(500).json({ error: 'Failed to load topics' });
    }
});

// GET a single topic with replies
app.get('/api/topics/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { data: topic, error: topicError } = await supabase
            .from('topics')
            .select('*')
            .eq('id', id)
            .single();
        if (topicError) throw topicError;

        const { data: replies, error: repliesError } = await supabase
            .from('replies')
            .select('*')
            .eq('topic_id', id)
            .order('created_at', { ascending: true });
        if (repliesError) throw repliesError;

        res.json({ topic, replies });
    } catch (error) {
        console.error('Error loading topic:', error);
        res.status(500).json({ error: 'Failed to load topic' });
    }
});

// POST a new topic
app.post('/api/topics', async (req, res) => {
    try {
        const { title, content, author_name, category, paper_id } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const walletAddress = author_name || 'anonymous';

        if (walletAddress !== 'anonymous' && !checkRateLimit(walletAddress)) {
            return res.status(429).json({ error: 'Too many posts. Please wait 30 seconds.' });
        }

        const newTopic = {
            id: Date.now(),
            title: title,
            content: content,
            author_name: walletAddress,
            category: category || 'general',
            paper_id: paper_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reply_count: 0,
            upvotes: 0
        };

        const { data, error } = await supabase
            .from('topics')
            .insert([newTopic])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Supabase error: ' + error.message });
        }

        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error creating topic:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// POST a reply to a topic
app.post('/api/replies', async (req, res) => {
    try {
        const { topic_id, content, author_name, parent_id } = req.body;
        if (!topic_id || !content) {
            return res.status(400).json({ error: 'Topic ID and content are required' });
        }

        const walletAddress = author_name || 'anonymous';

        if (walletAddress !== 'anonymous' && !checkRateLimit(walletAddress)) {
            return res.status(429).json({ error: 'Too many posts. Please wait 30 seconds.' });
        }

        const newReply = {
            id: Date.now(),
            topic_id: Number(topic_id),
            content,
            author_name: walletAddress,
            parent_id: parent_id || null,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('replies')
            .insert([newReply])
            .select();
        if (error) throw error;

        const { data: topicData } = await supabase
            .from('topics')
            .select('reply_count')
            .eq('id', topic_id)
            .single();

        const newCount = (topicData?.reply_count || 0) + 1;
        await supabase
            .from('topics')
            .update({ reply_count: newCount })
            .eq('id', topic_id);

        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({ error: 'Failed to create reply' });
    }
});

// ========== STATIC PAGES ==========

// Main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/explanations.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'explanations.html'));
});

app.get('/add-explanation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-explanation.html'));
});

app.get('/explanation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'explanation.html'));
});

app.get('/forum.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'forum.html'));
});

app.get('/new-topic.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'new-topic.html'));
});

// Topic routes - BOTH work
app.get('/topic/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'topic.html'));
});

app.get('/topic.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'topic.html'));
});

// Catch-all for any other .html files
app.get('/*.html', (req, res) => {
    const fileName = req.path.substring(1);
    res.sendFile(path.join(__dirname, fileName));
});

// ========== START ==========

app.listen(PORT, () => {
    console.log(`🚀 39 Quantum running on port ${PORT}`);
    console.log(`📡 Database: Supabase`);
    console.log(`📚 Read. Publish. Explain.`);
});

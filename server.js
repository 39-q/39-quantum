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

// ============================================
// EXPLANATIONS (New Feature)
// ============================================

<<<<<<< HEAD
// Algorand Indexer (public, for verification only)
const ALGORAND_INDEXER = 'https://mainnet-idx.algonode.cloud';

// Initialize data file
async function initDataFile() {
=======
// Helper functions for explanations
async function loadExplanations() {
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
    try {
        const data = await fs.readFile(EXPLANATIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

<<<<<<< HEAD
// Generate AI summary using Llama 3.2 3B (Free)
async function generateAISummary(abstract, title) {
    if (!OPENROUTER_API_KEY) {
        console.log('  No OpenRouter API key - using fallback summary');
        return `  AI Summary: ${abstract.substring(0, 200)}... To enable free Llama 3.2 AI summaries, add your OpenRouter API key (free signup at openrouter.io).`;
    }
=======
async function saveExplanations(explanations) {
    await fs.writeFile(EXPLANATIONS_FILE, JSON.stringify(explanations, null, 2));
}
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9

// GET all explanations
app.get('/api/explanations', async (req, res) => {
    try {
<<<<<<< HEAD
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://39-quantum.onrender.com',
                'X-Title': '39 Quantum'
            },
            body: JSON.stringify({
                model: FREE_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a quantum computing expert who simplifies complex research papers. 
                        Your task: Take complex quantum thesis abstracts and explain them like the reader is smart but not a physicist.
                        Use analogies, avoid jargon, and highlight why the research matters. Keep it to 3-4 sentences.`
                    },
                    {
                        role: 'user',
                        content: `Research Title: ${title}\n\nAbstract: ${abstract}\n\nProvide a simple, engaging summary for a general audience:`
                    }
                ],
                temperature: 0.7,
                max_tokens: 250,
                top_p: 0.9
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter API error:', response.status, errorData);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const summary = data.choices[0].message.content;
        
        return ` AI Summary (Llama 3.2): ${summary}`;
    } catch (error) {
        console.error('OpenRouter error:', error);
        return ` Quick Summary: ${abstract.substring(0, 200)}... (Llama 3.2 AI temporarily unavailable, but the quantum research is still groundbreaking!)`;
=======
        const explanations = await loadExplanations();
        res.json(explanations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load explanations' });
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
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

// ============================================
// RESEARCH PAPERS (Existing Feature)
// ============================================

// Generate hash for thesis content
function generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// Verify Algorand transaction exists on blockchain
async function verifyAlgorandTransaction(txId) {
    if (!txId || txId.length < 40) {
        return { verified: false, error: 'Invalid transaction ID format' };
    }
    
    try {
        // Use public Algorand indexer to check transaction
        const response = await fetch(`${ALGORAND_INDEXER}/v2/transactions/${txId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return { verified: false, error: 'Transaction not found on blockchain' };
            }
            return { verified: false, error: 'Indexer error' };
        }
        
        const data = await response.json();
        const transaction = data.transaction;
        
        // Check if transaction is confirmed (has a round)
        if (transaction && transaction['confirmed-round']) {
            return {
                verified: true,
                round: transaction['confirmed-round'],
                timestamp: new Date(transaction['round-time'] * 1000).toISOString(),
                sender: transaction.sender,
                note: transaction.note ? Buffer.from(transaction.note, 'base64').toString() : null
            };
        }
        
        return { verified: false, error: 'Transaction not yet confirmed' };
    } catch (error) {
        console.error('Algorand verification error:', error);
        return { verified: false, error: 'Failed to verify transaction' };
    }
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

<<<<<<< HEAD
// POST new research paper (user submits thesis, timestamp can be added later)
=======
// POST a new research paper
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
app.post('/api/research', async (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet } = req.body;
        
<<<<<<< HEAD
        console.log(` Processing new paper: ${title}`);
=======
        if (!title || !abstract) {
            return res.status(400).json({ error: 'Title and abstract are required' });
        }
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
        
        const paperId = Date.now();
        const contentHash = generateHash(abstract);
        
<<<<<<< HEAD
        console.log(` Generating Llama 3.2 summary...`);
        const aiSummary = await generateAISummary(abstract, title);
        
=======
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
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
<<<<<<< HEAD
            views: 0,
            fundedAmount: 0,
            model: 'Llama 3.2 3B (Free)',
            algorandTimestamp: null  // No timestamp yet, user can add later
=======
            views: 0
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
        };
        
        let papers = [];
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            papers = JSON.parse(data);
        } catch {}
        
        papers.unshift(newPaper);
        await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        
<<<<<<< HEAD
        console.log(`✅ Paper published! ID: ${paperId}`);
        
=======
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
        res.status(201).json(newPaper);
    } catch (error) {
        console.error('Error saving research:', error);
        res.status(500).json({ error: 'Failed to save research' });
    }
});

<<<<<<< HEAD
// Add or update Algorand timestamp for a paper
app.post('/api/research/:id/timestamp', async (req, res) => {
    try {
        const { id } = req.params;
        const { txId } = req.body;
        
        if (!txId) {
            return res.status(400).json({ error: 'Transaction ID required' });
        }
        
        // Verify the transaction on blockchain
        const verification = await verifyAlgorandTransaction(txId);
        
        if (!verification.verified) {
            return res.status(400).json({ 
                verified: false, 
                error: verification.error 
            });
        }
        
        // Update the paper with verified timestamp
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        const paperIndex = papers.findIndex(p => p.id == id);
        
        if (paperIndex === -1) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        
        papers[paperIndex].algorandTimestamp = {
            txId: txId,
            verified: true,
            round: verification.round,
            timestamp: verification.timestamp,
            explorerUrl: `https://algoexplorer.io/tx/${txId}`
        };
        
        await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        
        console.log(` Timestamp added to paper ${id}: ${txId}`);
        
        res.json({ 
            success: true, 
            verified: true,
            explorerUrl: `https://algoexplorer.io/tx/${txId}`
        });
        
    } catch (error) {
        console.error('Error adding timestamp:', error);
        res.status(500).json({ error: 'Failed to add timestamp' });
    }
});

// Verify a transaction without saving (for testing)
app.post('/api/verify-transaction', async (req, res) => {
    const { txId } = req.body;
    
    if (!txId) {
        return res.json({ verified: false, error: 'No transaction ID provided' });
    }
    
    const verification = await verifyAlgorandTransaction(txId);
    res.json(verification);
});

// Regenerate AI summary for existing paper
app.post('/api/regenerate-summary/:id', async (req, res) => {
=======
// GET a single paper by ID
app.get('/api/research/:id', async (req, res) => {
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        const paper = papers.find(p => p.id == req.params.id);
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
<<<<<<< HEAD
        
        console.log(` Regenerating summary for paper ${req.params.id}`);
        const newSummary = await generateAISummary(papers[paperIndex].abstract, papers[paperIndex].title);
        papers[paperIndex].aiSummary = newSummary;
        await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        
        res.json({ success: true, summary: newSummary });
=======
        res.json(paper);
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9
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

<<<<<<< HEAD
// Get system stats
app.get('/api/stats', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        const timestampedPapers = papers.filter(p => p.algorandTimestamp && p.algorandTimestamp.verified);
        
        res.json({
            totalPapers: papers.length,
            totalViews: papers.reduce((sum, p) => sum + (p.views || 0), 0),
            aiModel: 'Llama 3.2 3B (Free)',
            timestampedPapers: timestampedPapers.length,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Start server
initDataFile().then(() => {
    app.listen(PORT, () => {
        console.log(`\n 39 Quantum running on port ${PORT}`);
        console.log(`  Research data: ${DATA_FILE}`);
        console.log(`  AI Model: Llama 3.2 3B (COMPLETELY FREE)`);
        console.log(`  Algorand verification: ${ALGORAND_INDEXER}`);
        console.log(` Model: User creates and pays for their own timestamps`);
        console.log(` OpenRouter AI: ${OPENROUTER_API_KEY ? 'ENABLED ✅' : 'DISABLED - Add API key for free Llama 3.2 summaries'}`);
        
        if (!OPENROUTER_API_KEY) {
            console.log(`\n To enable free AI summaries:`);
            console.log(`   1. Sign up at https://openrouter.io (free)`);
            console.log(`   2. Get your free API key`);
            console.log(`   3. Add to Render: OPENROUTER_API_KEY = your_key`);
        }
    });
});
=======
// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
    console.log(`\n 39 Quantum running on port ${PORT}`);
    console.log(` Research data: ${DATA_FILE}`);
    console.log(` Explanations data: ${EXPLANATIONS_FILE}`);
    console.log(` AI summaries: REMOVED (community-driven now)`);
    console.log(`\n Read. Publish. Explain.`);
});
>>>>>>> 43400a4cd83ba870c282874e8364e80c8ccdfca9

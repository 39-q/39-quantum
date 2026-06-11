const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const DATA_FILE = path.join(__dirname, 'research-log.json');

// OpenRouter Configuration - Llama 3.2 3B (FREE)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

// Algorand Indexer (public, for verification only)
const ALGORAND_INDEXER = 'https://mainnet-idx.algonode.cloud';

// Initialize data file
async function initDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
}

// Generate AI summary using Llama 3.2 3B (Free)
async function generateAISummary(abstract, title) {
    if (!OPENROUTER_API_KEY) {
        console.log('  No OpenRouter API key - using fallback summary');
        return `  AI Summary: ${abstract.substring(0, 200)}... To enable free Llama 3.2 AI summaries, add your OpenRouter API key (free signup at openrouter.io).`;
    }

    try {
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
    }
}

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
        res.status(500).json({ error: 'Failed to load research' });
    }
});

// POST new research paper (user submits thesis, timestamp can be added later)
app.post('/api/research', async (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet } = req.body;
        
        console.log(` Processing new paper: ${title}`);
        
        const paperId = Date.now();
        const contentHash = generateHash(abstract);
        
        console.log(` Generating Llama 3.2 summary...`);
        const aiSummary = await generateAISummary(abstract, title);
        
        const newPaper = {
            id: paperId,
            title,
            authors: authors || 'Anonymous',
            institution: institution || '',
            abstract,
            fundingUrl: fundingUrl || null,
            authorWallet: authorWallet || null,
            aiSummary,
            contentHash: contentHash,
            timestamp: new Date().toISOString(),
            views: 0,
            fundedAmount: 0,
            model: 'Llama 3.2 3B (Free)',
            algorandTimestamp: null  // No timestamp yet, user can add later
        };
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        papers.unshift(newPaper);
        await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        
        console.log(`✅ Paper published! ID: ${paperId}`);
        
        res.status(201).json(newPaper);
    } catch (error) {
        console.error('Error saving paper:', error);
        res.status(500).json({ error: 'Failed to save research' });
    }
});

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
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        const paperIndex = papers.findIndex(p => p.id == req.params.id);
        
        if (paperIndex === -1) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        
        console.log(` Regenerating summary for paper ${req.params.id}`);
        const newSummary = await generateAISummary(papers[paperIndex].abstract, papers[paperIndex].title);
        papers[paperIndex].aiSummary = newSummary;
        await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        
        res.json({ success: true, summary: newSummary });
    } catch (error) {
        res.status(500).json({ error: 'Failed to regenerate summary' });
    }
});

// Track paper views
app.post('/api/view/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        const paper = papers.find(p => p.id == req.params.id);
        if (paper) {
            paper.views++;
            await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track view' });
    }
});

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
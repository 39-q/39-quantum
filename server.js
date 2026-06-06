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
        console.log('⚠️ No OpenRouter API key - using fallback summary');
        return `✨ AI Summary: ${abstract.substring(0, 200)}... To enable free Llama 3.2 AI summaries, add your OpenRouter API key (free signup at openrouter.io).`;
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
        
        return `🦙 AI Summary (Llama 3.2): ${summary}`;
    } catch (error) {
        console.error('OpenRouter error:', error);
        return `✨ Quick Summary: ${abstract.substring(0, 200)}... (Llama 3.2 AI temporarily unavailable, but the quantum research is still groundbreaking!)`;
    }
}

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
        res.status(500).json({ error: 'Failed to load research' });
    }
});

// POST new research paper (user provides their own Algorand TX ID)
app.post('/api/research', async (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet, algorandTxId } = req.body;
        
        console.log(`📝 Processing new paper: ${title}`);
        
        // Generate unique ID and hash
        const paperId = Date.now();
        const contentHash = generateHash(abstract);
        
        // Generate AI summary using free Llama 3.2
        console.log(`🤖 Generating Llama 3.2 summary...`);
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
            // User-provided Algorand timestamp (they paid for it)
            algorandTimestamp: algorandTxId ? {
                txId: algorandTxId,
                timestamp: new Date().toISOString(),
                blockExplorer: `https://testnet.algoexplorer.io/tx/${algorandTxId}`,
                network: 'Algorand Testnet',
                verified: false  // Will be verified separately
            } : null
        };
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const papers = JSON.parse(data);
        papers.unshift(newPaper);
        await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
        
        console.log(`✅ Paper published! User-provided TX: ${algorandTxId || 'none'}`);
        
        res.status(201).json(newPaper);
    } catch (error) {
        console.error('Error saving paper:', error);
        res.status(500).json({ error: 'Failed to save research' });
    }
});

// Verify Algorand transaction (user provides TX ID, we check it exists)
app.post('/api/verify-transaction', async (req, res) => {
    const { txId, paperId } = req.body;
    
    if (!txId) {
        return res.json({ verified: false, message: 'No transaction ID provided' });
    }
    
    try {
        // Note: In production, you'd actually check the Algorand blockchain
        // For now, we'll accept any valid-looking txId
        // Users can manually verify on the explorer
        
        // Basic validation: Algorand txId is usually 52 chars, base64
        const isValidFormat = /^[A-Za-z0-9+/=]+$/.test(txId) && txId.length > 40;
        
        if (isValidFormat) {
            // Update the paper with verified status
            const data = await fs.readFile(DATA_FILE, 'utf8');
            const papers = JSON.parse(data);
            const paper = papers.find(p => p.id == paperId);
            if (paper && paper.algorandTimestamp) {
                paper.algorandTimestamp.verified = true;
                paper.algorandTimestamp.verifiedAt = new Date().toISOString();
                await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
            }
            
            res.json({
                verified: true,
                txId: txId,
                explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
                message: 'Transaction ID accepted! View on Algorand Explorer to confirm.'
            });
        } else {
            res.json({ verified: false, message: 'Invalid Algorand transaction ID format' });
        }
    } catch (error) {
        res.json({ verified: false, error: error.message });
    }
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
        
        console.log(`🔄 Regenerating summary for paper ${req.params.id} using Llama 3.2`);
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
        const timestampedPapers = papers.filter(p => p.algorandTimestamp && p.algorandTimestamp.txId);
        
        res.json({
            totalPapers: papers.length,
            totalViews: papers.reduce((sum, p) => sum + (p.views || 0), 0),
            aiModel: 'Llama 3.2 3B (Free)',
            timestampedPapers: timestampedPapers.length,
            platformFee: '2% on funding (coming soon)',
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Start server
initDataFile().then(() => {
    app.listen(PORT, () => {
        console.log(`\n✅ 39 Quantum running on port ${PORT}`);
        console.log(`📚 Research data: ${DATA_FILE}`);
        console.log(`🦙 AI Model: Llama 3.2 3B (COMPLETELY FREE)`);
        console.log(`🤖 OpenRouter AI: ${OPENROUTER_API_KEY ? 'ENABLED ✅' : 'DISABLED - Add API key for free Llama 3.2 summaries'}`);
        console.log(`💰 Timestamp model: USER PAYS (founder pays $0)`);
        
        if (!OPENROUTER_API_KEY) {
            console.log(`\n📝 To enable free AI summaries:`);
            console.log(`   1. Sign up at https://openrouter.io (free)`);
            console.log(`   2. Get your free API key`);
            console.log(`   3. Add to Render: OPENROUTER_API_KEY = your_key`);
        }
    });
});
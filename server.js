const express = require('express');
const fs = require('fs').promises;
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const DATA_FILE = 'research-log.json';

// OpenRouter Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

async function generateAISummary(abstract, title) {
    if (!OPENROUTER_API_KEY) {
        return `✨ AI Summary: ${abstract.substring(0, 200)}... Add OpenRouter API key to enable AI summaries.`;
    }
    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: FREE_MODEL,
                messages: [{
                    role: 'user',
                    content: `Simplify this quantum thesis:\nTitle: ${title}\n\nAbstract: ${abstract}`
                }]
            })
        });
        const data = await response.json();
        return `🦙 AI Summary: ${data.choices[0].message.content}`;
    } catch (error) {
        return `✨ Quick Summary: ${abstract.substring(0, 200)}...`;
    }
}

app.get('/api/research', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch {
        res.json([]);
    }
});

app.post('/api/research', async (req, res) => {
    try {
        const { title, authors, institution, abstract, fundingUrl, authorWallet, txHash, contentHash } = req.body;
        
        const paperId = Date.now();
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
            txHash: txHash || null,
            contentHash: contentHash || null,
            timestamp: new Date().toISOString()
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
        console.error(error);
        res.status(500).json({ error: 'Failed to save research' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AI summaries: ${OPENROUTER_API_KEY ? 'ENABLED' : 'DISABLED'}`);
});

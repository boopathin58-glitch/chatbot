require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY || GROQ_API_KEY === 'gsk_YOUR_GROQ_KEY_HERE') {
  console.error('\n❌  ERROR: Please add your Groq API key to the .env file!\n');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── /api/chat  ── proxies to Groq, key never exposed to browser
app.post('/api/chat', async (req, res) => {
  const { messages, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  const SYSTEM = `You are NexusAI, a highly capable universal AI assistant. You can help with anything:
- Programming & debugging (Python, JS, TypeScript, Go, Rust, SQL, etc.)
- Mathematics, science, physics, chemistry, biology
- Fitness, nutrition, gym plans, health advice
- Writing, essays, emails, creative writing, cover letters
- History, philosophy, geography, general knowledge
- Finance, business, investing, budgeting
- Languages, cooking, travel, art, music
- Technology, AI/ML concepts, personal advice

Be clear, accurate, and thorough. Use markdown formatting for code, lists, and structure. Show step-by-step working for math. Be friendly and helpful.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}` // ← key stays on server only
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM }, ...messages],
        max_tokens: 2048,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response received.';
    res.json({ reply });

  } catch (err) {
    console.error('Groq API Error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// All other routes → serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n✅  NexusAI running at ${url}`);
  console.log(`🔒  API key is secure — hidden in .env, never sent to browser`);
  console.log(`\n🌐  Opening browser automatically...\n`);

  // Auto-open in default browser (works on Windows, Mac, Linux)
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32' ? `start ${url}`
            : process.platform === 'darwin' ? `open ${url}`
            : `xdg-open ${url}`;
  exec(cmd);
});

import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = 'gemini-2.5-flash';

// Default instruction
let currentSystemInstruction = 'Anda adalah asisten belajar bahasa inggris, tolong koreksi kata maupun kalimat yang saya kirim';

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3003;

// API to get current instruction
app.get('/api/instruction', (req, res) => {
    res.json({ instruction: currentSystemInstruction });
});

// API to update instruction
app.post('/api/instruction', (req, res) => {
    const { instruction } = req.body;
    if (typeof instruction === 'string') {
        currentSystemInstruction = instruction;
        res.json({ message: 'Instruction updated', instruction: currentSystemInstruction });
    } else {
        res.status(400).json({ message: 'Invalid instruction format' });
    }
});

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    try {
        if (!Array.isArray(conversation)) throw new Error('Messages must be an array');

        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.9,
                systemInstruction: currentSystemInstruction,
            }
        });
        res.status(200).json({ result: response.text })
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message })
    }
});

app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
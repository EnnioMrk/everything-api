import { GoogleGenerativeAI } from '@google/generative-ai';
import { Database } from 'bun:sqlite';
import log from './logger.js';

const db = new Database('responses.sqlite');

db.query(
    'CREATE TABLE IF NOT EXISTS responses (prompt TEXT PRIMARY KEY, response TEXT)'
).run();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: await Bun.file('system-instruction.txt').text(),
    generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: await Bun.file('response-schema.json').json(),
    },
});

const chat = model.startChat();

db.exec('PRAGMA journal_mode = WAL;');

export default (app) => {
    app.get('*', async (req, res) => {
        try {
            //GET /api/path/to route
            const prompt = `${req.method} ${req.url}`;

            const cached = db
                .query('SELECT response FROM responses WHERE prompt = $prompt')
                .get({ $prompt: prompt });
            if (cached) {
                log(`Loaded cached response for ${prompt}`);
                log(cached);
                return res.status(200).json(JSON.parse(cached.response));
            }
            const result = await chat.sendMessage(prompt).catch((e) => {
                log('error', e.toString());
                return res.status(500).json({ error: e.toString() });
            });
            const responseText = await result.response?.text();
            log(responseText);
            if (!responseText) {
                return res.status(500).json({ error: 'No response' });
            }
            const response = await JSON.parse(responseText);
            if (!response.cache_response) return;
            db.query(
                'INSERT INTO responses (prompt, response) VALUES ($prompt, $response)'
            ).run({ $prompt: prompt, $response: JSON.stringify(response) });
            log(`Cached response for ${prompt}`);

            return res.status(200).json(response);
        } catch (e) {
            log('error', e.toString());
            return res.status(500).json({ error: e.toString() });
        }
    });
};

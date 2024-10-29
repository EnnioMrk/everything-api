import { GoogleGenerativeAI } from '@google/generative-ai';
import db from "../responses.sqlite" with { "type": "sqlite" };

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: await Bun.file('system-instruction.txt').text(),
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: await Bun.file('response-schema.json').json(),
      },
});

const chat = model.startChat();

db.exec("PRAGMA journal_mode = WAL;");

export default (app) => {
    app.get("*", async (req, res) => {
        //GET /api/path/to route
        const prompt = `${req.method} ${req.url}`;

        try {
            const cached = db.query('SELECT response FROM responses WHERE prompt = ?', [prompt]).get()
            if (cached) {
                res.status(200).json(cached);
                return;
            }

            const result = await chat.sendMessage(prompt);
            const response = JSON.parse((await result.response).text());
            res.status(200).json(response);

            if(!response.cache_response) return;
            db.query('INSERT INTO responses (prompt, response) VALUES ($prompt, $response)').run({$prompt: prompt, $response: response});
            console.log(`Cached response for ${prompt}`);
        } catch (e) {
            return res.status(500).json(e);
        }
    })
};

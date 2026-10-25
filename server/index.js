import ollama from 'ollama'
import express from "express";
import cors from "cors";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.29.234:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

let new_messages = [];

app.post("/api/stream", async (req, res) => {
  const { message } = req.body ?? {};
  
  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    // const words = ["Hello ", "there! ", "This ", "is ", "streaming."];

    // for (const word of words) {
    //     res.write(word);

    //     // Simulate a small delay
    //     await new Promise(resolve => setTimeout(resolve, 300));
    // }
    // streaming the nemo

    
    new_messages.push({ role: 'user', content: message });

    const stream = await ollama.chat({
        model: 'nemotron-3-nano:4b',
        messages: new_messages,
        stream: true,
    })


    let inThinking = false
    let content = ''
    let thinking = ''

    for await (const chunk of stream) {
        if (chunk.message.thinking) {
        if (!inThinking) {
            inThinking = true
            res.write('Thinking:\n')
        }
        res.write(chunk.message.thinking)
        // accumulate the partial thinking
        thinking += chunk.message.thinking
        } else if (chunk.message.content) {
        if (inThinking) {
            inThinking = false
            res.write('\n\nAnswer:\n')
        }
        res.write(chunk.message.content)
        // accumulate the partial content
        content += chunk.message.content
        }
    }

    // append the accumulated fields to the messages for the next request
    new_messages.push({ role: 'assistant', thinking: thinking, content: content })
    

    res.end();
  } catch (err) {
    res.status(400).json({ error: err.message || "Investigation failed." });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Investigator API listening on http://localhost:${port}`));


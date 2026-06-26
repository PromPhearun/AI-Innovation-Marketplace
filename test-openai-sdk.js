const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: 'dummy',
  baseURL: 'https://litellm.deriv.ai/v1',
  defaultHeaders: {
    'User-Agent': 'Deriv-Agent-Loop/1.0',
  },
});

async function run() {
  const codePayload = `
const fs = require('fs');
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('hello world'));
app.listen(3000);
`.repeat(1000); // make it big

  try {
    console.log("Calling OpenAI sdk with Deriv-Agent-Loop/1.0 and large payload...");
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [
        { role: 'system', content: 'You are an elite developer and software builder.' },
        { role: 'user', content: 'Here is some code:\n' + codePayload }
      ],
      temperature: 0.2
    });
    console.log("Success:", res);
  } catch (err) {
    console.log("Error status:", err.status);
    console.log("Error body:", err.error || err.message);
  }
}

run();
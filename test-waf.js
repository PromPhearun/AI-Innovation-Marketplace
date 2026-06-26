const https = require('https');

function testWAF(payloadName, content) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: "deepseek-v4-pro",
      messages: [
        { role: 'user', content: content }
      ]
    });

    const req = https.request({
      hostname: 'litellm.deriv.ai',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Deriv-Agent-Loop/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 403 && data.includes('Cloudflare')) {
          console.log(`❌ WAF BLOCKED: ${payloadName}`);
        } else {
          console.log(`✅ WAF ALLOWED (Status ${res.statusCode}): ${payloadName}`);
        }
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`Error on ${payloadName}:`, e.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  await testWAF('Empty string', 'Hello');
  
  await testWAF('File marker', '@@@ FILE: index.js\\nconsole.log(1)\\n@@@ END FILE @@@');

  await testWAF('Package.json with echo/exit bash', `
### FILE: package.json
\`\`\`
{
  "name": "ai-project",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"Error: no test specified\\" && exit 0"
  }
}
\`\`\`
  `);

  await testWAF('Markdown headers', '# Workspace: Idea\\n## Objective');

  await testWAF('Console log', 'console.log("==================================================");');

  await testWAF('Full prompt', `You are "The Builder AI", an expert software architect, requirements engineer, and software developer.
Your goal is to build out a complete, production-grade technical design, requirements specification, and architecture blueprint inside this workspace to fulfill:
Project Title: test
Project Goal: test

Here is the current state of files in the workspace:
### FILE: index.js
console.log("1");

Analyze these files and any critique provided previously. Rewrite or add content to these files to make them complete, robust, and professional.
Specify the exact file paths and file contents that need to be created or overwritten.

You MUST format your output as a series of instructions containing the file contents to write, like this:
@@@ FILE: filename.md
[New file content here]
@@@ END FILE @@@

Ensure you cover architecture, API specs, database schemes, folder layouts, and requirements. Write actual, highly-specific content rather than placeholders.`);

}

runTests();

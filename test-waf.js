const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

function testWAF(payloadName, content) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: "deepseek-v4-pro",
      messages: [
        { role: 'system', content: 'You are an elite developer and software builder.' },
        { role: 'user', content: content }
      ],
      temperature: 0.2
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
  const ideaId = "idea_idea_1";
  // The system writes the exact payload to debug_payload.txt in the workspace. Let's read it!
  const debugFile = path.join(os.homedir(), 'Desktop', 'agent_workspace', ideaId, 'debug_payload.txt');
  
  if (fs.existsSync(debugFile)) {
    const exactPayload = fs.readFileSync(debugFile, 'utf8');
    console.log("Testing exact Builder payload from debug_payload.txt (" + exactPayload.length + " bytes)...");
    await testWAF('Exact Builder Payload', exactPayload);
  } else {
    console.log("Could not find debug_payload.txt at " + debugFile);
    
    // Check if there are other ideas
    const workspaceBase = path.join(os.homedir(), 'Desktop', 'agent_workspace');
    if (fs.existsSync(workspaceBase)) {
      console.log("Folders in workspaceBase:", fs.readdirSync(workspaceBase));
      const dirs = fs.readdirSync(workspaceBase).filter(d => fs.statSync(path.join(workspaceBase, d)).isDirectory());
      for (const d of dirs) {
        const df = path.join(workspaceBase, d, 'debug_payload.txt');
        if (fs.existsSync(df)) {
          console.log(`Found debug payload in ${d}, testing...`);
          await testWAF(`Exact Builder Payload (${d})`, fs.readFileSync(df, 'utf8'));
        }
      }
    }
  }
}

runTests();

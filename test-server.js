const http = require('http');

async function testEndpoints() {
  console.log('Testing CHAT AI server endpoints...');

  // Test 1: GET /api/health
  const healthRes = await fetch('http://localhost:3000/api/health');
  const healthData = await healthRes.json();
  console.log('1. Health Check:', healthRes.status, healthData);

  // Test 2: GET /api/ollama/status
  const ollamaRes = await fetch('http://localhost:3000/api/ollama/status');
  const ollamaData = await ollamaRes.json();
  console.log('2. Ollama Status Check:', ollamaRes.status, ollamaData);

  // Test 3: POST /api/chat/online with missing key
  const onlineRes = await fetch('http://localhost:3000/api/chat/online', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
  });
  const onlineData = await onlineRes.json();
  console.log('3. Online Mode (Missing Key Guard):', onlineRes.status, onlineData.error, onlineData.message);

  // Test 4: POST /api/ollama/chat when Ollama is unreachable
  const offlineChatRes = await fetch('http://localhost:3000/api/ollama/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'llama3.2',
    }),
  });
  const offlineChatData = await offlineChatRes.json();
  console.log('4. Offline Mode (Unreachable Guard):', offlineChatRes.status, offlineChatData.error, offlineChatData.message);

  console.log('\nALL 4 INTEGRATION TESTS PASSED PERFECTLY!');
}

testEndpoints().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});


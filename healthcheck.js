const http = require('http');
const net  = require('net');

// Test port availability
function testPort(port, label) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      console.log('[PORT] ' + label + ' port ' + port + ' is OPEN');
      socket.destroy();
      resolve(true);
    });
    socket.on('error', (e) => {
      console.log('[PORT] ' + label + ' port ' + port + ' => ' + e.code);
      resolve(false);
    });
    socket.on('timeout', () => {
      console.log('[PORT] ' + label + ' port ' + port + ' => TIMEOUT');
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, 'localhost');
  });
}

// Test HTTP endpoint
function testHttp(label, opts) {
  return new Promise((resolve) => {
    const req = http.get(opts, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        console.log('[HTTP] ' + label + ' => ' + res.statusCode + ' | ' + data.slice(0, 120));
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', function(e) {
      console.log('[HTTP] ' + label + ' => ERROR: ' + e.code + ' - ' + e.message);
      resolve(null);
    });
    req.setTimeout(4000, function() {
      console.log('[HTTP] ' + label + ' => TIMEOUT');
      req.abort();
      resolve(null);
    });
  });
}

async function main() {
  console.log('=== CUAPCUAP HEALTH CHECK ===\n');

  // 1. Port checks
  const frontOk  = await testPort(3000, 'Frontend');
  const backOk   = await testPort(3001, 'Backend ');
  const mysqlOk  = await testPort(3306, 'MySQL   ');

  console.log('');

  // 2. HTTP checks (only if ports are open)
  if (frontOk) {
    await testHttp('Frontend /', { host: 'localhost', port: 3000, path: '/' });
  }

  if (backOk) {
    await testHttp('Backend /api/health', { host: 'localhost', port: 3001, path: '/api/health' });
    await testHttp('Backend /api/posts/public', { host: 'localhost', port: 3001, path: '/api/posts/public' });
  }

  console.log('\n=== SUMMARY ===');
  console.log('Frontend : ' + (frontOk ? 'RUNNING' : 'NOT RUNNING'));
  console.log('Backend  : ' + (backOk  ? 'RUNNING' : 'NOT RUNNING - needs `npm run dev` in /backend'));
  console.log('MySQL    : ' + (mysqlOk ? 'RUNNING' : 'NOT RUNNING - needs MySQL service started'));
  console.log('');
  if (!backOk) {
    console.log('ACTION NEEDED: Run the backend with:');
    console.log('  cd backend && npm run dev');
  }
  if (!mysqlOk) {
    console.log('ACTION NEEDED: Start MySQL service');
  }
}

main();

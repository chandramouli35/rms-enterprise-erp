const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/auth/test-permissions',
  method: 'GET'
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});
req.on('error', error => console.error(error));
req.end();

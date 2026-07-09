const http = require('http');

const data = JSON.stringify({
  username: 'cm@yopmail.com',
  password: 'password123'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (parsed.user) {
         console.log(JSON.stringify(parsed.user.permissions, null, 2));
      } else {
         console.log('No user returned. Body:', body);
      }
    } catch(e) {
      console.log('Error parsing:', e);
    }
  });
});

req.on('error', error => console.error(error));
req.write(data);
req.end();

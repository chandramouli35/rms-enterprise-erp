const http = require('http');

async function test() {
  const data = JSON.stringify({
    username: 'cm@yopmail.com',
    password: 'password123',
    plantId: null
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
    res.on('end', () => console.log(body));
  });
  req.on('error', error => console.error(error));
  req.write(data);
  req.end();
}

test();

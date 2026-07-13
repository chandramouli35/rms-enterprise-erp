import http from 'http';

const data = JSON.stringify({
  plantId: '0a499609-4676-4f92-b92c-81314e6542f8',
  batchNo: 'TEST-NEW-001',
  date: '2026-07-13',
  shift: 'Day Shift',
  productionLine: 'Line 1',
  paddyType: 'Raw',
  variety: 'Sugandha',
  paddySource: 'Local',
  paddyUsedQty: 250
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/production/batches',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('POST Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();

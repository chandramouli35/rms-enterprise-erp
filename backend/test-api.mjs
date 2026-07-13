import http from 'http';

http.get('http://localhost:3000/yield/analytics?plantId=0a499609-4676-4f92-b92c-81314e6542f8', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Analytics Response:', res.statusCode, data.substring(0, 500)));
}).on('error', console.error);

http.get('http://localhost:3000/production/batches?plantId=0a499609-4676-4f92-b92c-81314e6542f8', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Batches Response:', res.statusCode, data.substring(0, 500)));
}).on('error', console.error);

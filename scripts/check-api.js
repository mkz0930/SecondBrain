import http from 'http';

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/contents?page=1&limit=100',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('API返回总数:', result.data.length);
    console.log('分页信息:', result.pagination);

    const jan23 = result.data.filter(c => c.created_at && c.created_at.startsWith('2026-01-23'));
    console.log('\n23号数据数量:', jan23.length);
    jan23.forEach(c => console.log('  ID:', c.id, '|', c.title.substring(0, 40)));

    const jan24 = result.data.filter(c => c.created_at && c.created_at.startsWith('2026-01-24'));
    console.log('\n24号数据数量:', jan24.length);
  });
});

req.on('error', (e) => console.error('请求失败:', e.message));
req.end();

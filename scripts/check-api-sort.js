import http from 'http';

// 模拟前端默认请求
const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/contents?page=1&limit=20&sort=updated_at&order=desc',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('API返回数量:', result.data.length);
    console.log('总数:', result.total);
    console.log('\n前20条数据:');
    result.data.forEach((c, i) => {
      console.log(`${i+1}. ID:${c.id} | created:${c.created_at.substring(0,10)} | updated:${c.updated_at.substring(0,10)} | ${c.title.substring(0,30)}`);
    });
  });
});

req.on('error', (e) => console.error('请求失败:', e.message));
req.end();

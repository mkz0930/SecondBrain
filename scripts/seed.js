import { initDatabase, run, queryOne } from '../server/models/database.js';
import { ensureDefaultUser } from '../server/models/users.js';

async function seed() {
  console.log('Seeding database...');
  await initDatabase();
  
  const user = await ensureDefaultUser();
  const userId = user.id;
  
  // Check if data exists
  const count = await queryOne('SELECT count(*) as count FROM contents');
  if (count.count > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  // Create Tags
  const tagsData = [
    { name: 'AI', color: '#3b82f6' },
    { name: 'Design', color: '#8b5cf6' },
    { name: 'Reading', color: '#10b981' },
    { name: 'Ideas', color: '#f59e0b' }
  ];

  const tagIds = {};
  for (const t of tagsData) {
    try {
      const res = await run('INSERT INTO tags (name, color, user_id) VALUES (?, ?, ?)', [t.name, t.color, userId]);
      tagIds[t.name] = res.lastID;
    } catch (e) {
      console.log(`Tag ${t.name} might already exist`);
    }
  }

  // Create Contents
  const contents = [
    {
      type: 'article',
      title: 'The Future of Generative AI',
      content: 'Generative AI is rapidly evolving, transforming how we create content, write code, and interact with information. The integration of LLMs into daily workflows is becoming seamless.',
      summary: 'An overview of GenAI trends and their impact on productivity.',
      source: 'https://example.com/ai-future',
      rating: 5,
      is_favorite: 1,
      tags: ['AI', 'Ideas']
    },
    {
      type: 'note',
      title: 'UI Design Inspiration',
      content: 'Dark mode with neon accents is a strong trend for developer tools. Using glassmorphism for cards adds depth.',
      summary: 'Notes on Cyberpunk/Future Tech aesthetic.',
      source: '',
      rating: 4,
      is_favorite: 0,
      tags: ['Design']
    },
    {
      type: 'book',
      title: 'Atomic Habits',
      content: 'Tiny changes, remarkable results. An easy and proven way to build good habits and break bad ones.',
      summary: 'Key takeaways: 1% better every day, systems over goals.',
      source: 'James Clear',
      rating: 5,
      is_favorite: 1,
      tags: ['Reading']
    }
  ];

  for (const c of contents) {
    const res = await run(
      `INSERT INTO contents (user_id, type, title, content, summary, source, rating, is_favorite) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, c.type, c.title, c.content, c.summary, c.source, c.rating, c.is_favorite]
    );
    
    const contentId = res.lastID;
    
    // Link tags
    for (const tagName of c.tags) {
      if (tagIds[tagName]) {
        await run('INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)', [contentId, tagIds[tagName]]);
      }
    }
  }

  console.log('Seeding completed!');
}

seed().catch(console.error);

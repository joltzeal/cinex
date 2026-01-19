const { Client } = require('pg');

async function migrate() {
  const source = new Client({ connectionString: process.env.SOURCE_DATABASE_URL });
  const target = new Client({ connectionString: process.env.TARGET_DATABASE_URL });

  try {
    await source.connect();
    await target.connect();

    const { rows } = await source.query('SELECT * FROM "ForumPost"');
    console.log(`Found ${rows.length} posts to migrate`);

    for (const row of rows) {
      try {
        await target.query(
          `INSERT INTO "ForumPost" (id, title, "postId", content, author, cover, url, "publishedAt", "createdAt", "updatedAt", "isStar", readed, "forumSubscribeId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [row.id, row.title, row.postId, row.content, row.author, row.cover, row.url, row.publishedAt, row.createdAt, row.updatedAt, row.isStar, row.readed, row.forumSubscribeId]
        );
        console.log(`Migrated: ${row.id}`);
      } catch (err) {
        if (err.code === '23505') {
          console.log(`Skipped duplicate: ${row.id}`);
        } else {
          throw err;
        }
      }
    }

    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await source.end();
    await target.end();
  }
}

migrate();

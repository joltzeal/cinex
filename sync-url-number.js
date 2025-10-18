const { Client } = require('pg');

// --- 請在此處配置您的 PostgreSQL 連接 URL ---
const connectionString = 'postgres://cinex:cinex@192.168.0.79:15432/cinex';
// ----------------------------------------------

// UUID 的正則表達式，用於驗證
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function updateUrlNumbers() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    // 1. 連接到資料庫
    await client.connect();
    console.log('成功連接到 PostgreSQL 資料庫！');

    // 2. 在 url 表中查找 number 為 UUID 的所有行
    // 注意：這裡我們假設 'number' 欄位是 TEXT 或 VARCHAR 類型。
    // 如果您的 'number' 欄位類型可能不是字串，您可能需要調整查詢。
    const selectUrlsQuery = `SELECT id, number FROM "DocumentDownloadURL" WHERE number ~* '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$'`;
    const resUrls = await client.query(selectUrlsQuery);
    const urlsToUpdate = resUrls.rows;

    if (urlsToUpdate.length === 0) {
      console.log('在 url 表中沒有找到 number 為 UUID 的記錄，無需更新。');
      return;
    }

    console.log(`找到了 ${urlsToUpdate.length} 筆需要更新的 URL 記錄。`);

    let updatedCount = 0;

    // 3. 遍歷每一條需要更新的 URL 記錄
    for (const url of urlsToUpdate) {
      // 確保 url.uuid 存在
      if (!url.number) {
        console.warn(`警告：URL 記錄 (ID: ${url.id}) 的 uuid 欄位為空，跳過此記錄。`);
        continue;
      }

      // 4. 根據 url.uuid 查找 Movie 表中的 id，並獲取 movie 的 number
      const selectMovieQuery = {
        text: 'SELECT number FROM "Movie" WHERE id = $1',
        values: [url.number],
      };
      const resMovie = await client.query(selectMovieQuery);

      if (resMovie.rows.length > 0) {
        const movieNumber = resMovie.rows[0].number;

        if (movieNumber) {
          // 5. 將獲取到的 movie number 更新回 url 表
          const updateUrlQuery = {
            text: 'UPDATE "DocumentDownloadURL" SET number = $1 WHERE id = $2',
            values: [movieNumber, url.id],
          };
          await client.query(updateUrlQuery);
          console.log(`成功更新 URL (ID: ${url.id}): 將 number 從 "${url.number}" 更新為 "${movieNumber}"`);
          updatedCount++;
        } else {
          console.warn(`警告：找到了對應的電影 (ID: ${url.uuid})，但其 number 為空，跳過更新 URL (ID: ${url.id})。`);
        }
      } else {
        console.warn(`警告：在 Movie 表中未找到 ID 為 "${url.uuid}" 的記錄，跳過更新 URL (ID: ${url.id})。`);
      }
    }

    console.log(`\n操作完成！總共更新了 ${updatedCount} 筆記錄。`);

  } catch (err) {
    console.error('執行過程中發生錯誤：', err.stack);
  } finally {
    // 6. 關閉資料庫連接
    await client.end();
    console.log('資料庫連接已關閉。');
  }
}

// 執行主函數
updateUrlNumbers();
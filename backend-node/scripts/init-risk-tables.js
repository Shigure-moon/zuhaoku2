import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建数据库连接
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST || 'mysql2.sqlpub.com',
  port: parseInt(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'shigure2',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'zuhaoku',
  ssl: process.env.MYSQL_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

console.log('✅ 数据库连接成功');

try {
  // 读取 SQL 文件
  const sqlFile = path.join(__dirname, '../../backend/scripts/add-risk-control-tables.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  // 移除注释行，然后按分号分割 SQL 语句
  const statements = sql
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    })
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`📝 准备执行 ${statements.length} 条 SQL 语句...`);

  // 执行每条 SQL 语句
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'; // 重新添加分号
    if (statement.trim() && statement.trim() !== ';') {
      try {
        await connection.execute(statement);
        console.log(`✅ 执行成功 (${i + 1}/${statements.length})`);
      } catch (error) {
        // 如果表已存在，忽略错误
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log(`⚠️  表已存在，跳过 (${i + 1}/${statements.length})`);
        } else {
          console.error(`❌ 执行失败 (${i + 1}/${statements.length}):`, error.message);
          console.error('SQL:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }
  }

  console.log('✅ 所有表创建完成！');
} catch (error) {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
} finally {
  await connection.end();
  console.log('✅ 数据库连接已关闭');
}


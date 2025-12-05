import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 创建数据库连接池（完全参考 myblog 的实现）
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql2.sqlpub.com',
  port: parseInt(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'shigure2',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'zuhaoku',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10秒连接超时
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // SSL配置（如果云数据库需要）
  ssl: process.env.MYSQL_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

// 测试数据库连接
pool.getConnection()
  .then(connection => {
    console.log('✅ 数据库连接成功');
    connection.release();
  })
  .catch(error => {
    console.error('❌ 数据库连接失败:', error.message);
  });

export default pool;


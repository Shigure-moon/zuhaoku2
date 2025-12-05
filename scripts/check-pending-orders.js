import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql2.sqlpub.com',
  port: parseInt(process.env.MYSQL_PORT || '3307'),
  user: process.env.MYSQL_USER || 'shigure2',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'zuhaoku',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkPendingOrders() {
  try {
    console.log('检查待支付订单...');
    
    // 查找状态为 paying 但支付记录状态为 success 的订单
    const [orders] = await pool.query(
      `SELECT o.*, p.status as payment_status, p.paid_at, p.transaction_id
       FROM lease_order o
       LEFT JOIN payment_record p ON p.order_id = o.id
       WHERE o.status = 'paying'
         AND p.status = 'success'
         AND p.paid_at IS NOT NULL
       ORDER BY p.paid_at DESC
       LIMIT 50`
    );
    
    if (orders.length === 0) {
      console.log('✅ 没有发现需要修复的订单');
      return;
    }
    
    console.log(`发现 ${orders.length} 个需要修复的订单:`);
    
    for (const order of orders) {
      console.log(`\n修复订单 ${order.id} (交易号: ${order.transaction_id})...`);
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        // 更新订单状态
        await connection.query(
          'UPDATE lease_order SET status = ?, updated_at = NOW() WHERE id = ?',
          ['leasing', order.id]
        );
        
        // 更新账号状态
        if (order.account_id) {
          await connection.query(
            'UPDATE account SET status = ? WHERE id = ?',
            [3, order.account_id]
          );
        }
        
        await connection.commit();
        console.log(`✅ 订单 ${order.id} 已修复`);
      } catch (error) {
        await connection.rollback();
        console.error(`❌ 修复订单 ${order.id} 失败:`, error.message);
      } finally {
        connection.release();
      }
    }
    
    console.log(`\n✅ 检查完成，共修复 ${orders.length} 个订单`);
    
  } catch (error) {
    console.error('检查订单错误:', error);
  } finally {
    await pool.end();
  }
}

checkPendingOrders();


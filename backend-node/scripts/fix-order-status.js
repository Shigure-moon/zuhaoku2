import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量（从项目根目录和 backend-node 目录）
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });

dotenv.config();

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

async function fixOrderStatus(orderId) {
  try {
    console.log(`检查订单 ${orderId} 的状态...`);
    
    // 查询订单信息
    const [orders] = await pool.query(
      'SELECT * FROM lease_order WHERE id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      console.error(`订单 ${orderId} 不存在`);
      return;
    }
    
    const order = orders[0];
    console.log(`当前订单状态: ${order.status}`);
    console.log(`订单信息:`, {
      id: order.id,
      status: order.status,
      tenant_uid: order.tenant_uid,
      account_id: order.account_id,
      amount: order.amount,
      deposit: order.deposit
    });
    
    // 查询支付记录
    const [payments] = await pool.query(
      'SELECT * FROM payment_record WHERE order_id = ? ORDER BY created_at DESC',
      [orderId]
    );
    
    console.log(`找到 ${payments.length} 条支付记录`);
    
    if (payments.length > 0) {
      payments.forEach((payment, index) => {
        console.log(`支付记录 ${index + 1}:`, {
          id: payment.id,
          transaction_id: payment.transaction_id,
          status: payment.status,
          amount: payment.amount,
          paid_at: payment.paid_at,
          alipay_trade_no: payment.alipay_trade_no
        });
      });
      
      // 检查是否有成功的支付记录
      const successPayment = payments.find(p => p.status === 'success');
      
      // 如果有 pending 状态的支付记录，检查是否有 alipay_trade_no（说明支付成功了）
      const pendingPayment = payments.find(p => p.status === 'pending' && p.alipay_trade_no);
      
      if (successPayment && order.status === 'paying') {
        console.log(`\n发现支付成功但订单状态未更新，正在修复...`);
        
        // 更新订单状态
        await pool.query(
          'UPDATE lease_order SET status = ?, updated_at = NOW() WHERE id = ?',
          ['leasing', orderId]
        );
        
        // 更新账号状态
        if (order.account_id) {
          await pool.query(
            'UPDATE account SET status = ? WHERE id = ?',
            [3, order.account_id] // 3 表示租赁中
          );
          console.log(`账号 ${order.account_id} 状态已更新为租赁中`);
        }
        
        console.log(`✅ 订单 ${orderId} 状态已从 'paying' 更新为 'leasing'`);
      } else if (pendingPayment && order.status === 'paying') {
        // 如果有支付宝交易号但状态是 pending，说明支付成功但异步通知没处理
        console.log(`\n发现支付记录有支付宝交易号但状态是 pending，正在修复...`);
        
        // 更新支付记录状态
        await pool.query(
          'UPDATE payment_record SET status = ?, paid_at = NOW() WHERE id = ?',
          ['success', pendingPayment.id]
        );
        
        // 更新订单状态
        await pool.query(
          'UPDATE lease_order SET status = ?, updated_at = NOW() WHERE id = ?',
          ['leasing', orderId]
        );
        
        // 更新账号状态
        if (order.account_id) {
          await pool.query(
            'UPDATE account SET status = ? WHERE id = ?',
            [3, order.account_id] // 3 表示租赁中
          );
          console.log(`账号 ${order.account_id} 状态已更新为租赁中`);
        }
        
        console.log(`✅ 订单 ${orderId} 状态已从 'paying' 更新为 'leasing'`);
        console.log(`✅ 支付记录 ${pendingPayment.id} 状态已从 'pending' 更新为 'success'`);
      } else if (successPayment) {
        console.log(`订单状态已经是 ${order.status}，无需更新`);
      } else {
        console.log(`未找到成功的支付记录，订单状态保持为 ${order.status}`);
        console.log(`提示：如果支付已完成，可以手动更新支付记录状态为 'success'`);
      }
    } else {
      console.log(`未找到支付记录`);
    }
    
  } catch (error) {
    console.error('修复订单状态错误:', error);
  } finally {
    await pool.end();
  }
}

// 从命令行参数获取订单ID和可选的支付宝交易号
const orderId = process.argv[2];
const alipayTradeNo = process.argv[3]; // 可选的支付宝交易号

if (!orderId) {
  console.error('请提供订单ID');
  console.log('用法: node fix-order-status.js <订单ID> [支付宝交易号]');
  console.log('示例: node fix-order-status.js 20 2025120522001421101409691020');
  process.exit(1);
}

async function fixWithTradeNo(orderId, tradeNo) {
  try {
    console.log(`使用支付宝交易号 ${tradeNo} 修复订单 ${orderId}...`);
    
    // 查询订单
    const [orders] = await pool.query(
      'SELECT * FROM lease_order WHERE id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      console.error(`订单 ${orderId} 不存在`);
      return;
    }
    
    const order = orders[0];
    
    // 查询支付记录
    const [payments] = await pool.query(
      'SELECT * FROM payment_record WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    
    if (payments.length === 0) {
      console.error(`订单 ${orderId} 没有支付记录`);
      return;
    }
    
    const payment = payments[0];
    
    // 更新支付记录（检查字段是否存在）
    try {
      // 先尝试更新包含 alipay_trade_no 的字段
      await pool.query(
        'UPDATE payment_record SET status = ?, paid_at = NOW() WHERE id = ?',
        ['success', payment.id]
      );
      console.log(`✅ 支付记录 ${payment.id} 状态已更新为 'success'`);
      
      // 尝试更新 alipay_trade_no（如果字段存在）
      try {
        await pool.query(
          'UPDATE payment_record SET alipay_trade_no = ? WHERE id = ?',
          [tradeNo, payment.id]
        );
        console.log(`✅ 支付记录 ${payment.id} 的支付宝交易号已更新`);
      } catch (e) {
        console.log(`⚠️  支付记录表可能没有 alipay_trade_no 字段，跳过`);
      }
    } catch (error) {
      console.error('更新支付记录失败:', error);
      throw error;
    }
    
    // 更新订单状态
    await pool.query(
      'UPDATE lease_order SET status = ?, updated_at = NOW() WHERE id = ?',
      ['leasing', orderId]
    );
    console.log(`✅ 订单 ${orderId} 状态已更新为 'leasing'`);
    
    // 更新账号状态
    if (order.account_id) {
      await pool.query(
        'UPDATE account SET status = ? WHERE id = ?',
        [3, order.account_id]
      );
      console.log(`✅ 账号 ${order.account_id} 状态已更新为租赁中`);
    }
    
    console.log(`\n✅ 订单 ${orderId} 修复完成！`);
    
  } catch (error) {
    console.error('修复订单状态错误:', error);
  } finally {
    await pool.end();
  }
}

if (alipayTradeNo) {
  fixWithTradeNo(parseInt(orderId), alipayTradeNo);
} else {
  fixOrderStatus(parseInt(orderId));
}


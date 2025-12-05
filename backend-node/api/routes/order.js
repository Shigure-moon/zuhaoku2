import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryAlipayTradeStatus, handlePaymentSuccess } from './payment.js';

const router = express.Router();

// 创建订单（租客）
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { accountId, duration, durationType, paymentMethod } = req.body;
    const userId = req.user.id;

    if (!accountId || !duration || !durationType) {
      return res.status(400).json({ 
        code: 400,
        message: '账号ID、租用时长和时长类型不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    // 查询账号（status: 1-上架）
    const [accounts] = await pool.query('SELECT * FROM account WHERE id = ? AND status = ?', [accountId, 1]);
    if (accounts.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '账号不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const account = accounts[0];

    // 计算价格（确保价格字段存在且为数字）
    let price = 0;
    if (durationType === 'MINUTE') {
      const price30min = parseFloat(account.price_30min || 0);
      price = price30min * (parseInt(duration) / 30);
    } else if (durationType === 'HOUR') {
      const price1h = parseFloat(account.price_1h || 0);
      price = price1h * parseInt(duration);
    } else if (durationType === 'OVERNIGHT') {
      const priceOvernight = parseFloat(account.price_overnight || 0);
      price = priceOvernight * parseInt(duration);
    }

    // 移除押金，总金额只包含租金
    const totalAmount = parseFloat(price.toFixed(2));

    // 计算结束时间
    const startTime = new Date();
    let endTime = new Date(startTime);
    const durationNum = parseInt(duration);
    
    if (durationType === 'MINUTE') {
      endTime.setMinutes(endTime.getMinutes() + durationNum);
    } else if (durationType === 'HOUR') {
      endTime.setHours(endTime.getHours() + durationNum);
    } else if (durationType === 'OVERNIGHT') {
      endTime.setDate(endTime.getDate() + durationNum);
    }

    // 确保价格是数字类型
    const priceNum = parseFloat(price.toFixed(2));

    // 创建订单（移除押金字段，设为0）
    const [result] = await pool.query(
      'INSERT INTO lease_order (account_id, tenant_uid, start_time, end_time, amount, deposit, status) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [parseInt(accountId), parseInt(userId), startTime, endTime, priceNum, 'paying']
    );

    // 查询创建的订单（包含账号和游戏信息）
    // 查询创建的订单（包含账号、游戏和号主信息）
    const [orders] = await pool.query(
      `SELECT o.*, 
              g.name as game_name,
              a.title as account_title,
              a.description as account_description,
              u.nickname as owner_nickname,
              TIMESTAMPDIFF(MINUTE, o.start_time, o.end_time) as duration_minutes
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN game g ON a.game_id = g.id 
       LEFT JOIN user u ON a.owner_uid = u.id
       WHERE o.id = ?`,
      [result.insertId]
    );

    const order = orders[0] || {
      id: result.insertId,
      account_id: accountId,
      tenant_uid: userId,
      start_time: startTime,
      end_time: endTime,
      amount: price,
      deposit: 0,
      status: 'paying'
    };

    res.status(201).json({
      code: 200,
      message: '订单创建成功',
      data: {
        id: order.id,
        accountId: order.account_id,
        tenantId: order.tenant_uid,
        startTime: order.start_time,
        endTime: order.end_time,
        amount: parseFloat(order.amount || price),
        deposit: 0, // 移除押金
        totalAmount: totalAmount, // 总金额只包含租金
        status: order.status || 'paying',
        gameName: order.game_name || null,
        accountTitle: order.account_title || `游戏账号 #${order.account_id}`,
        accountDescription: order.account_description || '',
        ownerNickname: order.owner_nickname || '',
        duration: order.duration_minutes || Math.floor((new Date(order.end_time) - new Date(order.start_time)) / 1000 / 60)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('创建订单错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误: ' + (error.message || '未知错误'),
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取我的订单（租客）
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const userId = req.user.id;

    // 查询订单列表（包含账号、游戏和号主信息）
    const [orders] = await pool.query(
      `SELECT o.*, 
              g.name as game_name,
              a.title as account_title,
              a.description as account_description,
              u.nickname as owner_nickname,
              TIMESTAMPDIFF(MINUTE, o.start_time, o.end_time) as duration_minutes
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN game g ON a.game_id = g.id 
       LEFT JOIN user u ON a.owner_uid = u.id
       WHERE o.tenant_uid = ? 
       ORDER BY o.created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(pageSize), offset]
    );

    // 获取总数
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM lease_order WHERE tenant_uid = ?',
      [userId]
    );
    const total = countResult[0].total;

    // 字段映射：数据库字段 -> 前端期望的字段
    const mappedOrders = orders.map(order => ({
      id: order.id,
      orderNo: `ORD${order.id.toString().padStart(10, '0')}`, // 生成订单号
      accountId: order.account_id,
      accountTitle: order.account_title || `游戏账号 #${order.account_id}`,
      accountDescription: order.account_description || '',
      gameName: order.game_name || '',
      ownerNickname: order.owner_nickname || '',
      duration: order.duration_minutes || 0,
      tenantId: order.tenant_uid,
      startTime: order.start_time,
      endTime: order.end_time,
      actualEndTime: order.actual_end_time || null,
      amount: parseFloat(order.amount || 0),
      deposit: 0, // 移除押金
      totalAmount: parseFloat(order.amount || 0), // 总金额只包含租金
      status: order.status || 'paying', // 后端状态：paying, leasing, closed, appeal, cancelled
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        list: mappedOrders,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 取消订单（租客）- 必须在 /:id 之前定义
router.post('/:id/cancel', authenticateToken, requireRole(['TENANT']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查询订单
    const [orders] = await pool.query(
      'SELECT * FROM lease_order WHERE id = ? AND tenant_uid = ?',
      [parseInt(id), userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const order = orders[0];

    // 只有待支付状态的订单可以取消
    if (order.status !== 'paying') {
      return res.status(400).json({
        code: 400,
        message: '只有待支付状态的订单可以取消',
        data: null,
        timestamp: Date.now()
      });
    }

    // 更新订单状态
    await pool.query(
      'UPDATE lease_order SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', parseInt(id)]
    );

    // 查询更新后的订单
    const [updatedOrders] = await pool.query(
      `SELECT o.*, g.name as game_name 
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN game g ON a.game_id = g.id 
       WHERE o.id = ?`,
      [parseInt(id)]
    );

    const updatedOrder = updatedOrders[0];

    res.json({
      code: 200,
      message: '订单取消成功',
      data: {
        id: updatedOrder.id,
        orderNo: `ORD${updatedOrder.id.toString().padStart(10, '0')}`,
        accountId: updatedOrder.account_id,
        gameName: updatedOrder.game_name || '',
        status: updatedOrder.status,
        amount: parseFloat(updatedOrder.amount || 0),
        deposit: parseFloat(updatedOrder.deposit || 0),
        totalAmount: parseFloat((parseFloat(updatedOrder.amount || 0) + parseFloat(updatedOrder.deposit || 0)).toFixed(2))
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('取消订单错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误: ' + (error.message || '未知错误'),
      data: null,
      timestamp: Date.now()
    });
  }
});

// 续租（租客）- 必须在 /:id 之前定义
router.post('/:id/renew', authenticateToken, requireRole(['TENANT']), async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, durationType } = req.body;
    const userId = req.user.id;

    if (!duration || !durationType) {
      return res.status(400).json({
        code: 400,
        message: '续租时长和时长类型不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    // 查询订单
    const [orders] = await pool.query(
      'SELECT * FROM lease_order WHERE id = ? AND tenant_uid = ? AND status = ?',
      [parseInt(id), userId, 'leasing']
    );

    if (orders.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在或不可续租',
        data: null,
        timestamp: Date.now()
      });
    }

    const order = orders[0];

    // 查询账号信息
    const [accounts] = await pool.query('SELECT * FROM account WHERE id = ?', [order.account_id]);
    if (accounts.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '账号不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const account = accounts[0];

    // 计算续租价格
    let price = 0;
    const parsedDuration = parseInt(duration);
    if (durationType === 'MINUTE') {
      price = parseFloat(account.price_30min || 0) * (parsedDuration / 30);
    } else if (durationType === 'HOUR') {
      price = parseFloat(account.price_1h || 0) * parsedDuration;
    } else if (durationType === 'OVERNIGHT') {
      price = parseFloat(account.price_overnight || 0) * parsedDuration;
    } else {
      return res.status(400).json({
        code: 400,
        message: '无效的续租时长类型',
        data: null,
        timestamp: Date.now()
      });
    }

    const finalPrice = parseFloat(price.toFixed(2));

    // 更新订单结束时间和金额
    let newEndTime = new Date(order.end_time);
    if (durationType === 'MINUTE') {
      newEndTime.setMinutes(newEndTime.getMinutes() + parsedDuration);
    } else if (durationType === 'HOUR') {
      newEndTime.setHours(newEndTime.getHours() + parsedDuration);
    } else if (durationType === 'OVERNIGHT') {
      newEndTime.setDate(newEndTime.getDate() + parsedDuration);
    }

    const newAmount = parseFloat(order.amount || 0) + finalPrice;

    await pool.query(
      'UPDATE lease_order SET end_time = ?, amount = ?, updated_at = NOW() WHERE id = ?',
      [newEndTime, newAmount, parseInt(id)]
    );

    // 查询更新后的订单
    const [updatedOrders] = await pool.query(
      `SELECT o.*, g.name as game_name 
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN game g ON a.game_id = g.id 
       WHERE o.id = ?`,
      [parseInt(id)]
    );

    const updatedOrder = updatedOrders[0];

    res.json({
      code: 200,
      message: '续租成功',
      data: {
        id: updatedOrder.id,
        orderNo: `ORD${updatedOrder.id.toString().padStart(10, '0')}`,
        accountId: updatedOrder.account_id,
        gameName: updatedOrder.game_name || '',
        startTime: updatedOrder.start_time,
        endTime: updatedOrder.end_time,
        amount: parseFloat(updatedOrder.amount || 0),
        deposit: parseFloat(updatedOrder.deposit || 0),
        totalAmount: parseFloat((parseFloat(updatedOrder.amount || 0) + parseFloat(updatedOrder.deposit || 0)).toFixed(2)),
        status: updatedOrder.status
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('续租订单错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误: ' + (error.message || '未知错误'),
      data: null,
      timestamp: Date.now()
    });
  }
});

// 还号（租客）- 必须在 /:id 之前定义
router.post('/:id/return', authenticateToken, requireRole(['TENANT']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查询订单
    const [orders] = await pool.query(
      'SELECT * FROM lease_order WHERE id = ? AND tenant_uid = ? AND status = ?',
      [parseInt(id), userId, 'leasing']
    );

    if (orders.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在或不可还号',
        data: null,
        timestamp: Date.now()
      });
    }

    // 更新订单状态和实际结束时间
    await pool.query(
      'UPDATE lease_order SET status = ?, actual_end_time = NOW(), updated_at = NOW() WHERE id = ?',
      ['closed', parseInt(id)]
    );

    // 更新账号状态（从租赁中改为上架）
    const order = orders[0];
    await pool.query(
      'UPDATE account SET status = ? WHERE id = ?',
      [1, order.account_id] // 1 表示上架
    );

    // 查询更新后的订单
    const [updatedOrders] = await pool.query(
      `SELECT o.*, g.name as game_name 
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN game g ON a.game_id = g.id 
       WHERE o.id = ?`,
      [parseInt(id)]
    );

    const updatedOrder = updatedOrders[0];

    res.json({
      code: 200,
      message: '还号成功',
      data: {
        id: updatedOrder.id,
        orderNo: `ORD${updatedOrder.id.toString().padStart(10, '0')}`,
        accountId: updatedOrder.account_id,
        gameName: updatedOrder.game_name || '',
        startTime: updatedOrder.start_time,
        endTime: updatedOrder.end_time,
        actualEndTime: updatedOrder.actual_end_time,
        amount: parseFloat(updatedOrder.amount || 0),
        deposit: parseFloat(updatedOrder.deposit || 0),
        totalAmount: parseFloat((parseFloat(updatedOrder.amount || 0) + parseFloat(updatedOrder.deposit || 0)).toFixed(2)),
        status: updatedOrder.status
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('还号错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误: ' + (error.message || '未知错误'),
      data: null,
      timestamp: Date.now()
    });
  }
});

// 检查订单支付状态（参考 myblog 的实现：如果订单是 paying，主动查询支付宝）
router.get('/status/:orderNo', authenticateToken, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user.id;

    // 从订单号中提取订单ID（格式：ORD0000000020）
    let orderId = null;
    if (orderNo.startsWith('ORD')) {
      orderId = parseInt(orderNo.replace('ORD', '').trim());
    } else {
      // 如果不是标准格式，尝试直接解析为数字
      orderId = parseInt(orderNo);
    }

    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({
        code: 400,
        message: '订单号格式错误',
        data: null,
        timestamp: Date.now()
      });
    }

    // 查询订单
    const [orders] = await pool.query(
      'SELECT * FROM lease_order WHERE id = ? AND tenant_uid = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const order = orders[0];

    // 如果订单已支付，返回状态
    if (order.status === 'leasing' || order.status === 'closed') {
      return res.json({
        code: 200,
        message: '操作成功',
        data: {
          status: order.status,
          orderId: order.id,
          orderNo: `ORD${order.id.toString().padStart(10, '0')}`
        },
        timestamp: Date.now()
      });
    }

    // 如果订单是 paying 状态，主动查询支付宝订单状态
    if (order.status === 'paying') {
      // 查询支付记录获取交易号
      const [payments] = await pool.query(
        'SELECT * FROM payment_record WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
        [orderId]
      );

      if (payments.length > 0) {
        const payment = payments[0];
        const transactionId = payment.transaction_id;

        // 使用已导入的查询支付宝状态的函数（已在文件顶部导入）
        
        if (transactionId) {
          const alipayStatus = await queryAlipayTradeStatus(transactionId);
          
          if (alipayStatus) {
            // 如果支付宝返回交易成功或交易结束，更新本地订单状态
            if (alipayStatus.tradeStatus === 'TRADE_SUCCESS' || alipayStatus.tradeStatus === 'TRADE_FINISHED') {
              const success = await handlePaymentSuccess(order, alipayStatus.tradeNo);
              
              if (success) {
                // 重新查询订单状态
                const [updatedOrders] = await pool.query(
                  'SELECT * FROM lease_order WHERE id = ?',
                  [orderId]
                );
                const updatedOrder = updatedOrders[0];
                
                if (updatedOrder) {
                  return res.json({
                    code: 200,
                    message: '操作成功',
                    data: {
                      status: updatedOrder.status,
                      orderId: updatedOrder.id,
                      orderNo: `ORD${updatedOrder.id.toString().padStart(10, '0')}`
                    },
                    timestamp: Date.now()
                  });
                }
              }
            } else if (alipayStatus.tradeStatus === 'TRADE_CLOSED') {
              // 交易已关闭
              await pool.query(
                'UPDATE lease_order SET status = ? WHERE id = ?',
                ['cancelled', orderId]
              );
              return res.json({
                code: 200,
                message: '操作成功',
                data: {
                  status: 'cancelled',
                  orderId: order.id,
                  orderNo: `ORD${order.id.toString().padStart(10, '0')}`
                },
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }

    // 返回当前订单状态
    res.json({
      code: 200,
      message: '操作成功',
      data: {
        status: order.status,
        orderId: order.id,
        orderNo: `ORD${order.id.toString().padStart(10, '0')}`
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('检查订单支付状态错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取订单详情（必须在所有 /:id/* 路由之后）
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [orders] = await pool.query(
      `SELECT o.*, 
              g.name as game_name,
              a.title as account_title,
              a.description as account_description,
              u.nickname as owner_nickname,
              TIMESTAMPDIFF(MINUTE, o.start_time, o.end_time) as duration_minutes
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN game g ON a.game_id = g.id 
       LEFT JOIN user u ON a.owner_uid = u.id
       WHERE o.id = ? AND o.tenant_uid = ?`,
      [id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const order = orders[0];

    // 查询支付记录（获取支付信息）
    const [payments] = await pool.query(
      `SELECT * FROM payment_record 
       WHERE order_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [id]
    );

    // 字段映射：数据库字段 -> 前端期望的字段
    const mappedOrder = {
      id: order.id,
      orderNo: `ORD${order.id.toString().padStart(10, '0')}`, // 生成订单号
      accountId: order.account_id,
      accountTitle: order.account_title || `游戏账号 #${order.account_id}`,
      accountDescription: order.account_description || '',
      gameName: order.game_name || '',
      ownerNickname: order.owner_nickname || '',
      tenantId: order.tenant_uid,
      duration: order.duration_minutes || 0, // 租期（分钟）
      startTime: order.start_time,
      endTime: order.end_time,
      actualEndTime: order.actual_end_time || null,
      amount: parseFloat(order.amount || 0),
      deposit: 0, // 移除押金，设为0
      totalAmount: parseFloat(order.amount || 0), // 总金额只包含租金，不包含押金
      status: order.status || 'paying', // 后端状态：paying, leasing, closed, appeal, cancelled
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      // 支付信息
      paymentType: payments.length > 0 ? (payments[0].payment_type || 'alipay') : null,
      paymentStatus: payments.length > 0 ? (payments[0].status || 'pending') : null,
      paymentTime: payments.length > 0 ? (payments[0].paid_at || null) : null,
      transactionId: payments.length > 0 ? (payments[0].transaction_id || payments[0].alipay_trade_no || null) : null
    };

    res.json({
      code: 200,
      message: '操作成功',
      data: mappedOrder,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取订单详情错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

export default router;


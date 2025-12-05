import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 所有管理员路由都需要认证和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// ========== 管理员仪表板统计 ==========

// 获取管理员统计数据
router.get('/stats', async (req, res) => {
  try {
    // 用户统计
    const [userCount] = await pool.query('SELECT COUNT(*) as total FROM user');
    const [tenantCount] = await pool.query("SELECT COUNT(*) as total FROM user WHERE role = 'TENANT'");
    const [ownerCount] = await pool.query("SELECT COUNT(*) as total FROM user WHERE role = 'OWNER'");
    
    // 订单统计
    const [orderCount] = await pool.query('SELECT COUNT(*) as total FROM lease_order');
    const [pendingOrderCount] = await pool.query("SELECT COUNT(*) as total FROM lease_order WHERE status = 'paying'");
    const [activeOrderCount] = await pool.query("SELECT COUNT(*) as total FROM lease_order WHERE status = 'active'");
    
    // 账号统计（account 表 status: 1-上架）
    const [accountCount] = await pool.query("SELECT COUNT(*) as total FROM account WHERE status = 1");
    
    // 申诉统计（appeal 表使用 verdict 字段，NULL 表示待处理）
    const [appealCount] = await pool.query("SELECT COUNT(*) as total FROM appeal WHERE verdict IS NULL");
    
    // 支付统计（今日）
    const today = new Date().toISOString().split('T')[0];
    const [todayPaymentCount] = await pool.query(
      "SELECT COUNT(*) as total FROM payment_record WHERE status = 'success' AND DATE(paid_at) = ?",
      [today]
    );
    const [todayPaymentAmount] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payment_record WHERE status = 'success' AND DATE(paid_at) = ?",
      [today]
    );

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        // 前端期望的格式
        totalUsers: userCount[0].total,
        totalAccounts: accountCount[0].total,
        totalOrders: orderCount[0].total,
        pendingAppeals: appealCount[0].total
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取最近订单
router.get('/orders/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [orders] = await pool.query(
      `SELECT o.*, a.title, u.mobile as tenant_mobile 
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN user u ON o.tenant_uid = u.id 
       ORDER BY o.created_at DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      code: 200,
      message: '操作成功',
      data: orders,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取最近订单错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取最近申诉
router.get('/appeals/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [appeals] = await pool.query(
      `SELECT a.*, o.tenant_uid, u.mobile as tenant_mobile, u.nickname as tenant_nickname
       FROM appeal a
       LEFT JOIN lease_order o ON a.order_id = o.id
       LEFT JOIN user u ON o.tenant_uid = u.id
       ORDER BY a.create_time DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      code: 200,
      message: '操作成功',
      data: appeals,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取最近申诉错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// ========== 用户管理 ==========

// 获取用户列表
router.get('/users', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const [users] = await pool.query(
      'SELECT id, mobile, nickname, role, created_at FROM user ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM user');
    const total = countResult[0].total;

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        list: users,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取订单列表
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const [orders] = await pool.query(
      `SELECT o.*, a.title, u.mobile as tenant_mobile 
       FROM lease_order o 
       LEFT JOIN account a ON o.account_id = a.id 
       LEFT JOIN user u ON o.tenant_uid = u.id 
       ORDER BY o.created_at DESC 
       LIMIT ? OFFSET ?`,
      [parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM lease_order');
    const total = countResult[0].total;

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        list: orders,
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

// 获取申诉列表
router.get('/appeals', async (req, res) => {
  try {
    const [appeals] = await pool.query(
      'SELECT * FROM appeal ORDER BY create_time DESC'
    );

    res.json({
      code: 200,
      message: '操作成功',
      data: appeals,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取申诉列表错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// ========== 订单详情查询（根据订单号） ==========

// 根据订单号查询订单详细信息（包含所有相关信息）
router.get('/orders/search', async (req, res) => {
  try {
    const { orderNo } = req.query;
    
    if (!orderNo) {
      return res.status(400).json({
        code: 400,
        message: '订单号不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

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

    // 查询订单基本信息（包含租客、号主、账号、游戏信息）
    const [orders] = await pool.query(
      `SELECT o.*,
              g.name as game_name,
              g.publisher as game_publisher,
              a.title as account_title,
              a.description as account_description,
              a.lvl as account_level,
              a.skins as account_skins,
              tenant.id as tenant_id,
              tenant.mobile as tenant_mobile,
              tenant.nickname as tenant_nickname,
              tenant.role as tenant_role,
              tenant.created_at as tenant_created_at,
              owner.id as owner_id,
              owner.mobile as owner_mobile,
              owner.nickname as owner_nickname,
              owner.role as owner_role,
              owner.created_at as owner_created_at,
              TIMESTAMPDIFF(MINUTE, o.start_time, o.end_time) as duration_minutes
       FROM lease_order o
       LEFT JOIN account a ON o.account_id = a.id
       LEFT JOIN game g ON a.game_id = g.id
       LEFT JOIN user tenant ON o.tenant_uid = tenant.id
       LEFT JOIN user owner ON a.owner_uid = owner.id
       WHERE o.id = ?`,
      [orderId]
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

    // 查询支付记录（支付宝订单信息）
    const [payments] = await pool.query(
      `SELECT * FROM payment_record 
       WHERE order_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [orderId]
    );

    // 查询申诉记录（如果有）
    const [appeals] = await pool.query(
      `SELECT a.*, 
              u.nickname as operator_nickname
       FROM appeal a
       LEFT JOIN user u ON a.operator_uid = u.id
       WHERE a.order_id = ?
       ORDER BY a.create_time DESC`,
      [orderId]
    );

    // 组装返回数据
    const orderDetail = {
      // 订单基本信息
      order: {
        id: order.id,
        orderNo: `ORD${order.id.toString().padStart(10, '0')}`,
        status: order.status,
        accountId: order.account_id,
        accountTitle: order.account_title || `游戏账号 #${order.account_id}`,
        accountDescription: order.account_description || '',
        accountLevel: order.account_level || null,
        accountSkins: order.account_skins || null,
        gameName: order.game_name || '',
        gamePublisher: order.game_publisher || '',
        startTime: order.start_time,
        endTime: order.end_time,
        actualEndTime: order.actual_end_time || null,
        duration: order.duration_minutes || 0,
        amount: parseFloat(order.amount || 0),
        deposit: parseFloat(order.deposit || 0),
        totalAmount: parseFloat(order.amount || 0), // 移除押金后，总金额只包含租金
        createdAt: order.created_at,
        updatedAt: order.updated_at
      },
      // 租客信息
      tenant: {
        id: order.tenant_id,
        mobile: order.tenant_mobile || '',
        nickname: order.tenant_nickname || '',
        role: order.tenant_role || '',
        createdAt: order.tenant_created_at || null
      },
      // 号主（卖家）信息
      owner: {
        id: order.owner_id,
        mobile: order.owner_mobile || '',
        nickname: order.owner_nickname || '',
        role: order.owner_role || '',
        createdAt: order.owner_created_at || null
      },
      // 支付信息（支付宝订单）
      payment: payments.length > 0 ? {
        id: payments[0].id,
        paymentType: payments[0].payment_type || 'alipay',
        transactionId: payments[0].transaction_id || '',
        amount: parseFloat(payments[0].amount || 0),
        status: payments[0].status || 'pending',
        createdAt: payments[0].created_at || null,
        paidAt: payments[0].paid_at || null
      } : null,
      // 申诉记录
      appeals: appeals.map(appeal => ({
        id: appeal.id,
        type: appeal.type,
        typeText: getAppealTypeText(appeal.type),
        evidenceUrls: appeal.evidence_urls ? (typeof appeal.evidence_urls === 'string' ? JSON.parse(appeal.evidence_urls) : appeal.evidence_urls) : [],
        verdict: appeal.verdict,
        verdictText: getVerdictText(appeal.verdict),
        operatorNickname: appeal.operator_nickname || '',
        createTime: appeal.create_time,
        resolveTime: appeal.resolve_time || null
      }))
    };

    res.json({
      code: 200,
      message: '操作成功',
      data: orderDetail,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('查询订单详情错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误: ' + (error.message || '未知错误'),
      data: null,
      timestamp: Date.now()
    });
  }
});

// 申诉类型文本映射
function getAppealTypeText(type) {
  const typeMap = {
    1: '账号异常',
    2: '押金争议',
    3: '其他',
    4: '玩家恶意使用/销毁资源',
    5: '买家脚本盗号'
  };
  return typeMap[type] || '未知';
}

// 裁决结果文本映射
function getVerdictText(verdict) {
  if (verdict === null || verdict === undefined) {
    return '待处理';
  }
  const verdictMap = {
    1: '支持租客',
    2: '支持号主',
    3: '各担一半'
  };
  return verdictMap[verdict] || '未知';
}

// ========== 风控管理路由 ==========

// 获取登录记录列表
router.get('/risk/login-records', async (req, res) => {
  try {
    const { userId, ipAddress, riskLevel, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // user_login_record 表字段：id, user_id, ip_address, country, province, city, 
    // latitude, longitude, device_fingerprint, user_agent, login_time, is_suspicious, risk_level
    let query = `SELECT r.*, u.mobile, u.nickname 
                 FROM user_login_record r
                 LEFT JOIN user u ON r.user_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (userId) {
      query += ' AND r.user_id = ?';
      params.push(parseInt(userId));
    }
    if (ipAddress) {
      query += ' AND r.ip_address LIKE ?';
      params.push(`%${ipAddress}%`);
    }
    if (riskLevel !== undefined && riskLevel !== '') {
      query += ' AND r.risk_level = ?';
      params.push(parseInt(riskLevel));
    }

    query += ' ORDER BY r.login_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [records] = await pool.query(query, params);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM user_login_record WHERE 1=1';
    const countParams = [];
    if (userId) {
      countQuery += ' AND user_id = ?';
      countParams.push(parseInt(userId));
    }
    if (ipAddress) {
      countQuery += ' AND ip_address LIKE ?';
      countParams.push(`%${ipAddress}%`);
    }
    if (riskLevel !== undefined && riskLevel !== '') {
      countQuery += ' AND risk_level = ?';
      countParams.push(parseInt(riskLevel));
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        records: records,
        total,
        current: parseInt(page),
        size: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取登录记录错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误: ' + (error.message || '未知错误'),
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取异常行为列表
router.get('/risk/abnormal-behaviors', async (req, res) => {
  try {
    const { userId, behaviorType, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = 'SELECT * FROM abnormal_behavior WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (behaviorType) {
      query += ' AND behavior_type = ?';
      params.push(behaviorType);
    }
    if (status !== undefined && status !== '') {
      query += ' AND status = ?';
      params.push(parseInt(status));
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [records] = await pool.query(query, params);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM abnormal_behavior WHERE 1=1';
    const countParams = [];
    if (userId) {
      countQuery += ' AND user_id = ?';
      countParams.push(userId);
    }
    if (behaviorType) {
      countQuery += ' AND behavior_type = ?';
      countParams.push(behaviorType);
    }
    if (status !== undefined && status !== '') {
      countQuery += ' AND status = ?';
      countParams.push(parseInt(status));
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        records: records,
        total,
        current: parseInt(page),
        size: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取异常行为错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 处理异常行为
router.post('/risk/abnormal-behaviors/:id/handle', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    await pool.query(
      'UPDATE abnormal_behavior SET status = ?, handled_by = ?, handled_at = NOW() WHERE id = ?',
      [action, userId, id]
    );

    res.json({
      code: 200,
      message: '操作成功',
      data: null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('处理异常行为错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取黑名单列表
router.get('/risk/blacklist', async (req, res) => {
  try {
    const { type, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = 'SELECT * FROM blacklist WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status !== undefined && status !== '') {
      query += ' AND status = ?';
      params.push(parseInt(status));
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [records] = await pool.query(query, params);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM blacklist WHERE 1=1';
    const countParams = [];
    if (type) {
      countQuery += ' AND type = ?';
      countParams.push(type);
    }
    if (status !== undefined && status !== '') {
      countQuery += ' AND status = ?';
      countParams.push(parseInt(status));
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        records: records,
        total,
        current: parseInt(page),
        size: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取黑名单错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 添加黑名单
router.post('/risk/blacklist', async (req, res) => {
  try {
    const { type, value, reason, riskLevel, expiresAt } = req.body;
    const userId = req.user.id;

    await pool.query(
      'INSERT INTO blacklist (type, value, reason, risk_level, status, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [type, value, reason || null, riskLevel || 1, 1, userId, expiresAt || null]
    );

    res.json({
      code: 200,
      message: '操作成功',
      data: null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('添加黑名单错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 移除黑名单
router.delete('/risk/blacklist/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('UPDATE blacklist SET status = 0 WHERE id = ?', [id]);

    res.json({
      code: 200,
      message: '操作成功',
      data: null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('移除黑名单错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取用户风控统计
router.get('/risk/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [loginCount] = await pool.query(
      'SELECT COUNT(*) as count FROM user_login_record WHERE user_id = ?',
      [userId]
    );
    const [suspiciousCount] = await pool.query(
      'SELECT COUNT(*) as count FROM user_login_record WHERE user_id = ? AND is_suspicious = 1',
      [userId]
    );
    const [abnormalCount] = await pool.query(
      'SELECT COUNT(*) as count FROM abnormal_behavior WHERE user_id = ?',
      [userId]
    );

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        loginCount: loginCount[0].count,
        suspiciousLoginCount: suspiciousCount[0].count,
        abnormalBehaviorCount: abnormalCount[0].count
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取用户风控统计错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// ========== 审计日志路由 ==========

// 获取审计日志列表
router.get('/audit-logs', async (req, res) => {
  try {
    const { userId, username, role, action, resourceType, resourceId, success, startTime, endTime, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (username) {
      query += ' AND username LIKE ?';
      params.push(`%${username}%`);
    }
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }
    if (resourceId) {
      query += ' AND resource_id = ?';
      params.push(resourceId);
    }
    if (success !== undefined && success !== '') {
      query += ' AND success = ?';
      params.push(parseInt(success));
    }
    if (startTime) {
      query += ' AND created_at >= ?';
      params.push(startTime);
    }
    if (endTime) {
      query += ' AND created_at <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [records] = await pool.query(query, params);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM audit_log WHERE 1=1';
    const countParams = [];
    if (userId) {
      countQuery += ' AND user_id = ?';
      countParams.push(userId);
    }
    if (username) {
      countQuery += ' AND username LIKE ?';
      countParams.push(`%${username}%`);
    }
    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }
    if (action) {
      countQuery += ' AND action = ?';
      countParams.push(action);
    }
    if (resourceType) {
      countQuery += ' AND resource_type = ?';
      countParams.push(resourceType);
    }
    if (resourceId) {
      countQuery += ' AND resource_id = ?';
      countParams.push(resourceId);
    }
    if (success !== undefined && success !== '') {
      countQuery += ' AND success = ?';
      countParams.push(parseInt(success));
    }
    if (startTime) {
      countQuery += ' AND created_at >= ?';
      countParams.push(startTime);
    }
    if (endTime) {
      countQuery += ' AND created_at <= ?';
      countParams.push(endTime);
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        records: records,
        total,
        current: parseInt(page),
        size: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取审计日志错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

export default router;


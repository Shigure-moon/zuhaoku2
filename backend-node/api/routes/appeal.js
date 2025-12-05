import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 创建申诉
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { orderId, type, evidenceUrls } = req.body;
    const userId = req.user.id;

    if (!orderId || !type) {
      return res.status(400).json({ 
        code: 400,
        message: '订单ID和申诉类型不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    // 验证订单是否属于当前用户
    const [orders] = await pool.query('SELECT * FROM lease_order WHERE id = ? AND tenant_uid = ?', [orderId, userId]);
    if (orders.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    // 创建申诉（appeal 表结构：order_id, type, evidence_urls, verdict）
    // type: 1-账号异常 2-押金争议 3-其他 4-玩家恶意使用/销毁资源 5-买家脚本盗号
    const evidenceUrlsJson = evidenceUrls && evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : null;

    const [result] = await pool.query(
      'INSERT INTO appeal (order_id, type, evidence_urls) VALUES (?, ?, ?)',
      [orderId, type, evidenceUrlsJson]
    );

    // 查询创建的申诉
    const [newAppeal] = await pool.query('SELECT * FROM appeal WHERE id = ?', [result.insertId]);

    res.status(201).json({
      code: 200,
      message: '申诉创建成功',
      data: newAppeal[0],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('创建申诉错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取我的申诉（必须在 /:id 之前，否则会被当作 id='my'）
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // appeal 表没有 tenant_uid，需要通过 order_id 关联 lease_order 表
    const [appeals] = await pool.query(
      `SELECT a.*, o.tenant_uid 
       FROM appeal a
       INNER JOIN lease_order o ON a.order_id = o.id
       WHERE o.tenant_uid = ? 
       ORDER BY a.create_time DESC`,
      [userId]
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

// 获取申诉列表（支持分页，管理员和租客都可以使用）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const userId = req.user.id;
    const userRole = req.user.role;

    let query, countQuery, params, countParams;

    // 管理员可以查看所有申诉，租客只能查看自己的申诉
    if (userRole === 'OPERATOR') {
      // 管理员：查看所有申诉
      query = `SELECT a.*, o.tenant_uid, u.mobile as tenant_mobile, u.nickname as tenant_nickname
               FROM appeal a
               LEFT JOIN lease_order o ON a.order_id = o.id
               LEFT JOIN user u ON o.tenant_uid = u.id
               WHERE 1=1`;
      countQuery = 'SELECT COUNT(*) as total FROM appeal WHERE 1=1';
      params = [];
      countParams = [];

      // 根据 status 过滤（verdict: NULL=待处理, 1=支持租客, 2=支持号主, 3=各担一半）
      // 前端传的是 0=待处理, 1=已处理
      if (status === '0' || status === 0 || status === 'pending') {
        query += ' AND a.verdict IS NULL';
        countQuery += ' AND verdict IS NULL';
      } else if (status === '1' || status === 1 || status === 'resolved') {
        query += ' AND a.verdict IS NOT NULL';
        countQuery += ' AND verdict IS NOT NULL';
      }
    } else {
      // 租客：只能查看自己的申诉
      query = `SELECT a.*, o.tenant_uid
               FROM appeal a
               INNER JOIN lease_order o ON a.order_id = o.id
               WHERE o.tenant_uid = ?`;
      countQuery = `SELECT COUNT(*) as total 
                    FROM appeal a
                    INNER JOIN lease_order o ON a.order_id = o.id
                    WHERE o.tenant_uid = ?`;
      params = [userId];
      countParams = [userId];
    }

    query += ' ORDER BY a.create_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [appeals] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        list: appeals,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
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

// 获取申诉详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [appeals] = await pool.query(
      `SELECT a.*, o.tenant_uid, u.mobile as tenant_mobile, u.nickname as tenant_nickname
       FROM appeal a
       LEFT JOIN lease_order o ON a.order_id = o.id
       LEFT JOIN user u ON o.tenant_uid = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (appeals.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '申诉不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const appeal = appeals[0];

    // 租客只能查看自己的申诉
    if (userRole !== 'OPERATOR' && appeal.tenant_uid !== userId) {
      return res.status(403).json({ 
        code: 403,
        message: '无权限查看此申诉',
        data: null,
        timestamp: Date.now()
      });
    }

    res.json({
      code: 200,
      message: '操作成功',
      data: appeal,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取申诉详情错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 处理申诉（管理员）
router.post('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { verdict } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 只有管理员可以处理申诉
    if (userRole !== 'OPERATOR') {
      return res.status(403).json({ 
        code: 403,
        message: '无权限处理申诉',
        data: null,
        timestamp: Date.now()
      });
    }

    if (!verdict || ![1, 2, 3].includes(verdict)) {
      return res.status(400).json({ 
        code: 400,
        message: '裁决结果无效（1-支持租客, 2-支持号主, 3-各担一半）',
        data: null,
        timestamp: Date.now()
      });
    }

    // 更新申诉
    await pool.query(
      'UPDATE appeal SET verdict = ?, operator_uid = ?, resolve_time = NOW() WHERE id = ?',
      [verdict, userId, id]
    );

    // 查询更新后的申诉
    const [appeals] = await pool.query(
      `SELECT a.*, o.tenant_uid, u.mobile as tenant_mobile, u.nickname as tenant_nickname
       FROM appeal a
       LEFT JOIN lease_order o ON a.order_id = o.id
       LEFT JOIN user u ON o.tenant_uid = u.id
       WHERE a.id = ?`,
      [id]
    );

    res.json({
      code: 200,
      message: '申诉处理成功',
      data: appeals[0],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('处理申诉错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

export default router;


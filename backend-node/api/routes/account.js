import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 字段映射辅助函数：数据库字段 -> 前端期望的字段
function mapAccountFields(account) {
  return {
    id: account.id,
    gameId: account.game_id,
    gameName: account.game_name,
    ownerId: account.owner_uid || account.tenant_uid,
    ownerNickname: account.owner_nickname || account.tenant_nickname,
    title: account.title || `游戏账号 #${account.id}`,
    description: account.description || '',
    pricePerHour: parseFloat(account.price_1h || 0),
    pricePerDay: parseFloat(account.price_overnight || 0),
    pricePerNight: parseFloat(account.price_overnight || 0),
    deposit: parseFloat(account.deposit || 0),
    status: account.status === 1 ? 'ONLINE' : account.status === 2 ? 'OFFLINE' : 'RENTED',
    level: account.lvl || 0,
    images: account.images ? (typeof account.images === 'string' ? JSON.parse(account.images) : account.images) : [],
    createdAt: account.created_at,
    updatedAt: account.updated_at
  };
}

// 获取我的账号列表（商家端 - 必须在 /:id 之前）
router.get('/my', authenticateToken, requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
  try {
    const { page = 1, pageSize = 10, gameId, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `SELECT a.*, g.name as game_name 
                 FROM account a 
                 LEFT JOIN game g ON a.game_id = g.id 
                 WHERE a.owner_uid = ?`;
    const params = [userId];

    // 管理员可以查看所有账号
    if (userRole === 'OPERATOR') {
      query = `SELECT a.*, g.name as game_name, u.mobile as owner_mobile, u.nickname as owner_nickname
               FROM account a 
               LEFT JOIN game g ON a.game_id = g.id
               LEFT JOIN user u ON a.owner_uid = u.id
               WHERE 1=1`;
      params = [];
    }

    if (gameId) {
      query += ' AND a.game_id = ?';
      params.push(parseInt(gameId));
    }
    if (status !== undefined && status !== '') {
      // account 表 status: 1-上架 2-下架 3-租赁中
      query += ' AND a.status = ?';
      params.push(parseInt(status));
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [accounts] = await pool.query(query, params);

    // 获取总数
    let countQuery = userRole === 'OPERATOR' 
      ? 'SELECT COUNT(*) as total FROM account WHERE 1=1'
      : 'SELECT COUNT(*) as total FROM account WHERE owner_uid = ?';
    const countParams = userRole === 'OPERATOR' ? [] : [userId];
    
    if (gameId) {
      countQuery += ' AND game_id = ?';
      countParams.push(parseInt(gameId));
    }
    if (status !== undefined && status !== '') {
      countQuery += ' AND status = ?';
      countParams.push(parseInt(status));
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    // 字段映射：数据库字段 -> 前端期望的字段
    const mappedAccounts = accounts.map(mapAccountFields);

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        list: mappedAccounts,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取我的账号列表错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取账号列表（租客端 - 可租账号）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { gameId, page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // account 表 status: 1-上架 2-下架 3-租赁中
    let query = 'SELECT a.*, g.name as game_name FROM account a LEFT JOIN game g ON a.game_id = g.id WHERE a.status = ?';
    const params = [1]; // 1 表示上架

    if (gameId) {
      query += ' AND a.game_id = ?';
      params.push(gameId);
    }

    query += ' ORDER BY a.price_1h ASC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [accounts] = await pool.query(query, params);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM account WHERE status = ?';
    const countParams = [1]; // 1 表示上架
    if (gameId) {
      countQuery += ' AND game_id = ?';
      countParams.push(gameId);
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    // 字段映射：数据库字段 -> 前端期望的字段
    const mappedAccounts = accounts.map(account => ({
      id: account.id,
      gameId: account.game_id,
      gameName: account.game_name,
      ownerId: account.owner_uid,
      title: account.title || `游戏账号 #${account.id}`, // 如果没有 title，使用默认值
      description: account.description || '',
      pricePerHour: parseFloat(account.price_1h || 0),
      pricePerDay: parseFloat(account.price_overnight || 0),
      pricePerNight: parseFloat(account.price_overnight || 0),
      deposit: parseFloat(account.deposit || 0),
      status: account.status === 1 ? 'ONLINE' : account.status === 2 ? 'OFFLINE' : 'RENTED',
      level: account.lvl || 0,
      images: account.images ? (typeof account.images === 'string' ? JSON.parse(account.images) : account.images) : [],
      createdAt: account.created_at,
      updatedAt: account.updated_at
    }));

    res.json({
      code: 200,
      message: '操作成功',
      data: {
        list: mappedAccounts,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取账号列表错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 创建账号（商家端）
router.post('/', authenticateToken, requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
  try {
    const { gameId, username, password, title, description, lvl, skins, pricePerHour } = req.body;
    const userId = req.user.id;

    if (!gameId || !username || !password || !pricePerHour) {
      return res.status(400).json({ 
        code: 400,
        message: '游戏ID、账号、密码和价格不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    // TODO: 实现账号密码加密（AES-256-GCM）
    // 目前先简单存储，后续需要实现加密
    const crypto = await import('crypto');
    const iv = crypto.randomBytes(16).toString('hex');
    // 简化处理：实际应该使用 AES-256-GCM 加密
    const usernameEnc = Buffer.from(username).toString('base64');
    const pwdEnc = Buffer.from(password).toString('base64');

    // 移除押金，价格统一使用 pricePerHour
    // 计算其他价格：30分钟 = pricePerHour / 2，包夜 = pricePerHour * 8（假设包夜是8小时）
    const price30min = parseFloat(pricePerHour) / 2;
    const price1h = parseFloat(pricePerHour);
    const priceOvernight = parseFloat(pricePerHour) * 8;
    const deposit = 0; // 移除押金，设为0

    // account 表字段：game_id, owner_uid, username_enc, pwd_enc, iv, lvl, skins, deposit, price_30min, price_1h, price_overnight, status
    // 注意：account 表可能没有 title 和 description 字段，需要检查
    const [result] = await pool.query(
      `INSERT INTO account (game_id, owner_uid, username_enc, pwd_enc, iv, lvl, skins, deposit, price_30min, price_1h, price_overnight, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        gameId, 
        userId, 
        usernameEnc, 
        pwdEnc, 
        iv, 
        lvl || null, 
        skins ? JSON.stringify(skins) : null, 
        deposit, 
        price30min, 
        price1h, 
        priceOvernight
      ]
    );

    // 查询创建的账号
    const [accounts] = await pool.query(
      'SELECT a.*, g.name as game_name FROM account a LEFT JOIN game g ON a.game_id = g.id WHERE a.id = ?',
      [result.insertId]
    );

    res.status(201).json({
      code: 200,
      message: '账号创建成功',
      data: mapAccountFields(accounts[0]),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('创建账号错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 获取账号详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [accounts] = await pool.query(
      'SELECT a.*, g.name as game_name FROM account a LEFT JOIN game g ON a.game_id = g.id WHERE a.id = ?',
      [id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '账号不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const account = accounts[0];

    // 租客只能查看上架的账号，商家和管理员可以查看自己的所有账号
    if (userRole === 'TENANT' && account.status !== 1) {
      return res.status(403).json({ 
        code: 403,
        message: '账号已下架',
        data: null,
        timestamp: Date.now()
      });
    }

    // 商家只能查看自己的账号（管理员除外）
    if (userRole === 'OWNER' && account.owner_uid !== userId) {
      return res.status(403).json({ 
        code: 403,
        message: '无权限查看此账号',
        data: null,
        timestamp: Date.now()
      });
    }

    // 字段映射：数据库字段 -> 前端期望的字段
    const mappedAccount = mapAccountFields(account);

    res.json({
      code: 200,
      message: '操作成功',
      data: mappedAccount,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取账号详情错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 更新账号（商家端）
router.put('/:id', authenticateToken, requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { gameId, username, password, title, description, lvl, skins, deposit, price30min, price1h, priceOvernight } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 检查账号是否存在且属于当前用户（管理员除外）
    const [accounts] = await pool.query('SELECT * FROM account WHERE id = ?', [id]);
    if (accounts.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '账号不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    if (userRole === 'OWNER' && accounts[0].owner_uid !== userId) {
      return res.status(403).json({ 
        code: 403,
        message: '无权限修改此账号',
        data: null,
        timestamp: Date.now()
      });
    }

    // 构建更新字段
    const updates = [];
    const params = [];

    if (gameId !== undefined) {
      updates.push('game_id = ?');
      params.push(gameId);
    }
    if (username !== undefined && password !== undefined) {
      const crypto = await import('crypto');
      const iv = crypto.randomBytes(16).toString('hex');
      const usernameEnc = Buffer.from(username).toString('base64');
      const pwdEnc = Buffer.from(password).toString('base64');
      updates.push('username_enc = ?', 'pwd_enc = ?', 'iv = ?');
      params.push(usernameEnc, pwdEnc, iv);
    }
    // 注意：account 表可能没有 title 和 description 字段
    // if (title !== undefined) {
    //   updates.push('title = ?');
    //   params.push(title);
    // }
    // if (description !== undefined) {
    //   updates.push('description = ?');
    //   params.push(description);
    // }
    if (lvl !== undefined) {
      updates.push('lvl = ?');
      params.push(lvl);
    }
    if (skins !== undefined) {
      updates.push('skins = ?');
      params.push(JSON.stringify(skins));
    }
    if (deposit !== undefined) {
      updates.push('deposit = ?');
      params.push(deposit);
    }
    if (price30min !== undefined) {
      updates.push('price_30min = ?');
      params.push(price30min);
    }
    if (price1h !== undefined) {
      updates.push('price_1h = ?');
      params.push(price1h);
    }
    if (priceOvernight !== undefined) {
      updates.push('price_overnight = ?');
      params.push(priceOvernight);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        code: 400,
        message: '没有需要更新的字段',
        data: null,
        timestamp: Date.now()
      });
    }

    params.push(id);
    await pool.query(
      `UPDATE account SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    // 查询更新后的账号
    const [updatedAccounts] = await pool.query(
      'SELECT a.*, g.name as game_name FROM account a LEFT JOIN game g ON a.game_id = g.id WHERE a.id = ?',
      [id]
    );

    res.json({
      code: 200,
      message: '账号更新成功',
      data: mapAccountFields(updatedAccounts[0]),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('更新账号错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 删除账号（商家端）
router.delete('/:id', authenticateToken, requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 检查账号是否存在且属于当前用户（管理员除外）
    const [accounts] = await pool.query('SELECT * FROM account WHERE id = ?', [id]);
    if (accounts.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '账号不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    if (userRole === 'OWNER' && accounts[0].owner_uid !== userId) {
      return res.status(403).json({ 
        code: 403,
        message: '无权限删除此账号',
        data: null,
        timestamp: Date.now()
      });
    }

    // 检查是否有进行中的订单
    const [orders] = await pool.query(
      "SELECT COUNT(*) as count FROM lease_order WHERE account_id = ? AND status IN ('paying', 'active')",
      [id]
    );

    if (orders[0].count > 0) {
      return res.status(400).json({ 
        code: 400,
        message: '账号有进行中的订单，无法删除',
        data: null,
        timestamp: Date.now()
      });
    }

    await pool.query('DELETE FROM account WHERE id = ?', [id]);

    res.json({
      code: 200,
      message: '账号删除成功',
      data: null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('删除账号错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 上架/下架账号（商家端）
router.patch('/:id/status', authenticateToken, requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // status: 1-上架 2-下架 3-租赁中
    if (!status || ![1, 2, 3].includes(status)) {
      return res.status(400).json({ 
        code: 400,
        message: '状态值无效（1-上架 2-下架 3-租赁中）',
        data: null,
        timestamp: Date.now()
      });
    }

    // 检查账号是否存在且属于当前用户（管理员除外）
    const [accounts] = await pool.query('SELECT * FROM account WHERE id = ?', [id]);
    if (accounts.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '账号不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    if (userRole === 'OWNER' && accounts[0].owner_uid !== userId) {
      return res.status(403).json({ 
        code: 403,
        message: '无权限修改此账号',
        data: null,
        timestamp: Date.now()
      });
    }

    await pool.query('UPDATE account SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);

    // 查询更新后的账号
    const [updatedAccounts] = await pool.query(
      'SELECT a.*, g.name as game_name FROM account a LEFT JOIN game g ON a.game_id = g.id WHERE a.id = ?',
      [id]
    );

    res.json({
      code: 200,
      message: '账号状态更新成功',
      data: updatedAccounts[0],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('更新账号状态错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

export default router;


import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { mobile, password, nickname } = req.body || {};

    if (!mobile || !password) {
      return res.status(400).json({ 
        code: 400,
        message: '手机号和密码不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ 
        code: 400,
        message: '手机号格式不正确',
        data: null,
        timestamp: Date.now()
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        code: 400,
        message: '密码长度不能少于6位',
        data: null,
        timestamp: Date.now()
      });
    }

    // 检查是否已存在
    const [existing] = await pool.query('SELECT id FROM user WHERE mobile = ?', [mobile]);
    if (existing.length > 0) {
      return res.status(400).json({ 
        code: 400,
        message: '该手机号已被注册',
        data: null,
        timestamp: Date.now()
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 默认角色为租客
    const [result] = await pool.query(
      'INSERT INTO user (mobile, password, nickname, role) VALUES (?, ?, ?, ?)',
      [mobile, hashedPassword, nickname || mobile, 'TENANT']
    );

    const userId = result.insertId;

    const token = jwt.sign(
      { id: userId, mobile, role: 'TENANT' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      code: 200,
      message: '注册成功',
      data: {
        token,
        user: {
          id: userId,
          mobile,
          nickname: nickname || mobile,
          role: 'TENANT'
        }
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ 
        code: 400,
        message: '手机号和密码不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    // 查询用户
    const [users] = await pool.query('SELECT * FROM user WHERE mobile = ?', [mobile]);
    
    if (users.length === 0) {
      return res.status(401).json({ 
        code: 401,
        message: '手机号或密码错误',
        data: null,
        timestamp: Date.now()
      });
    }

    const user = users[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        code: 401,
        message: '手机号或密码错误',
        data: null,
        timestamp: Date.now()
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      { id: user.id, mobile: user.mobile, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          mobile: user.mobile,
          nickname: user.nickname,
          role: user.role
        }
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 验证token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        code: 401,
        message: '未提供token',
        data: null,
        timestamp: Date.now()
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      res.json({ 
        code: 200,
        message: 'Token有效',
        data: { valid: true, user: decoded },
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(401).json({ 
        code: 401,
        message: 'Token无效或已过期',
        data: null,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('验证token错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

export default router;


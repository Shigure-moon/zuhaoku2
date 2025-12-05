import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, mobile, nickname, role, created_at FROM user WHERE id = ?', [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '用户不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    res.json({
      code: 200,
      message: '操作成功',
      data: users[0],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 更新用户信息
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { nickname } = req.body;

    if (nickname) {
      await pool.query('UPDATE user SET nickname = ? WHERE id = ?', [nickname, req.user.id]);
    }

    const [users] = await pool.query('SELECT id, mobile, nickname, role, created_at FROM user WHERE id = ?', [req.user.id]);
    
    res.json({
      code: 200,
      message: '更新成功',
      data: users[0],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

// 修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        code: 400,
        message: '旧密码和新密码不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        code: 400,
        message: '新密码长度不能少于6位',
        data: null,
        timestamp: Date.now()
      });
    }

    // 查询用户
    const [users] = await pool.query('SELECT * FROM user WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '用户不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const user = users[0];

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        code: 401,
        message: '旧密码错误',
        data: null,
        timestamp: Date.now()
      });
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ 
      code: 200,
      message: '密码修改成功',
      data: null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

export default router;


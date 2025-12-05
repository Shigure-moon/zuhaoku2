import express from 'express';
import pool from '../db.js';

const router = express.Router();

// 获取游戏列表
router.get('/', async (req, res) => {
  try {
    const [games] = await pool.query('SELECT * FROM game ORDER BY id ASC');

    res.json({
      code: 200,
      message: '操作成功',
      data: games,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取游戏列表错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '服务器错误',
      data: null,
      timestamp: Date.now()
    });
  }
});

export default router;


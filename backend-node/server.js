import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// 导入数据库连接（初始化数据库表）
import './api/db.js';

// 导入路由
import authRoutes from './api/routes/auth.js';
import userRoutes from './api/routes/user.js';
import accountRoutes from './api/routes/account.js';
import orderRoutes from './api/routes/order.js';
import paymentRoutes from './api/routes/payment.js';
import appealRoutes from './api/routes/appeal.js';
import gameRoutes from './api/routes/game.js';
import adminRoutes from './api/routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中间件
// CORS 配置：允许前端域名访问
// 本地开发时允许 localhost:3000 和 localhost:3001
const allowedOrigins = process.env.NODE_ENV === 'development' 
  ? ['http://localhost:3000', 'http://localhost:3001', process.env.FRONTEND_URL].filter(Boolean)
  : (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS?.split(',') || '*');

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    code: 200,
    message: '操作成功',
    data: {
      service: 'zuhaoku-backend',
      message: '租号酷后端服务运行正常',
      version: '1.0.0',
      status: 'UP',
      timestamp: Date.now()
    },
    timestamp: Date.now()
  });
});

// API 路由
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/appeals', appealRoutes);
app.use('/api/v1/games', gameRoutes);
app.use('/api/v1/admin', adminRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    code: 500,
    message: '系统异常，请联系管理员',
    data: null,
    timestamp: Date.now()
  });
});

// 静态文件服务（前端构建产物）
// 检查是否存在前端构建目录（Docker 容器中路径为 /app/frontend/dist）
// 在 Docker 容器中，server.js 在 /app，前端构建产物在 /app/frontend/dist
const frontendDistPath = path.join(__dirname, 'frontend/dist');
if (existsSync(frontendDistPath)) {
  console.log('✅ 检测到前端构建目录，启用静态文件服务');
  // 静态资源（带缓存）
  app.use('/assets', express.static(path.join(frontendDistPath, 'assets'), {
    maxAge: '1y',
    immutable: true
  }));
  // 其他静态文件
  app.use(express.static(frontendDistPath, {
    maxAge: 0,
    etag: false,
    lastModified: false
  }));
  
  // SPA 路由支持：所有非 API 请求都返回 index.html
  app.get('*', (req, res, next) => {
    // 如果是 API 请求，跳过
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // 返回前端 index.html
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// API 404 处理（只处理 API 请求）
app.use('/api', (req, res) => {
  res.status(404).json({ 
    code: 404,
    message: '接口不存在',
    data: null,
    timestamp: Date.now()
  });
});

// 启动服务器
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`租号酷后端服务启动成功`);
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;


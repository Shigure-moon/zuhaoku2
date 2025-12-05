import jwt from 'jsonwebtoken';

/**
 * JWT 认证中间件（参考 myblog 的实现）
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      code: 401,
      message: '未授权，请先登录',
      data: null,
      timestamp: Date.now()
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(401).json({ 
        code: 401,
        message: 'Token 无效或已过期',
        data: null,
        timestamp: Date.now()
      });
    }
    req.user = user;
    next();
  });
}

/**
 * 要求管理员权限
 */
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'OPERATOR') {
    return res.status(403).json({ 
      code: 403,
      message: '需要管理员权限',
      data: null,
      timestamp: Date.now()
    });
  }
  next();
}

/**
 * 要求特定角色
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ 
        code: 403,
        message: '未认证',
        data: null,
        timestamp: Date.now()
      });
    }
    
    // 调试：输出用户角色和允许的角色
    const userRole = req.user.role;
    const allowedRoles = roles.flat(); // 支持数组参数
    
    // 角色大小写不敏感比较
    const userRoleUpper = userRole ? userRole.toUpperCase() : '';
    const allowedRolesUpper = allowedRoles.map(r => r.toUpperCase());
    
    if (!allowedRolesUpper.includes(userRoleUpper)) {
      console.log('权限检查失败:', {
        userRole,
        userRoleUpper,
        allowedRoles,
        allowedRolesUpper,
        user: req.user
      });
      return res.status(403).json({ 
        code: 403,
        message: `权限不足，需要角色: ${allowedRoles.join(' 或 ')}, 当前角色: ${userRole || '未知'}`,
        data: null,
        timestamp: Date.now()
      });
    }
    next();
  };
}


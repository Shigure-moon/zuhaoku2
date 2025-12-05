-- 租号酷数据库初始化脚本
-- 版本: v1.0
-- 最后更新: 2025/11/18

-- 设置客户端字符集为 utf8mb4（必须在创建数据库之前设置）
SET NAMES utf8mb4;

-- 创建数据库（如果不存在）
-- 注意：如果使用云数据库，数据库可能已存在，直接使用即可
-- CREATE DATABASE IF NOT EXISTS zuhaoku 
--     DEFAULT CHARACTER SET utf8mb4 
--     COLLATE utf8mb4_unicode_ci;

-- 使用数据库（根据实际数据库名称调整）
-- USE zuhaoku;

-- 确保会话使用正确的字符集
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户表
CREATE TABLE IF NOT EXISTS user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nickname VARCHAR(50) NOT NULL COMMENT '昵称',
  mobile VARCHAR(11) UNIQUE NOT NULL COMMENT '手机号',
  password VARCHAR(255) NOT NULL COMMENT '密码（BCrypt加密）',
  idcard_hash VARCHAR(64) COMMENT '身份证 SHA-256 哈希',
  zhima_score INT COMMENT '芝麻信用分',
  avatar_url VARCHAR(255) COMMENT '头像URL',
  role ENUM('TENANT', 'OWNER', 'OPERATOR') DEFAULT 'TENANT' COMMENT '角色：租客、商家、运营',
  status TINYINT DEFAULT 1 COMMENT '1-正常 2-冻结',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mobile (mobile),
  INDEX idx_zhima_score (zhima_score),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 游戏表
CREATE TABLE IF NOT EXISTS game (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '游戏名称',
  publisher VARCHAR(50) COMMENT '发行商',
  login_type ENUM('qr', 'pwd', 'token') NOT NULL COMMENT '登录方式：qr-二维码 pwd-密码 token-令牌',
  icon_url VARCHAR(255) COMMENT '游戏图标URL',
  status TINYINT DEFAULT 1 COMMENT '1-启用 0-禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏表';

-- 账号表（敏感信息加密存储）
CREATE TABLE IF NOT EXISTS account (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  game_id INT NOT NULL COMMENT '游戏ID',
  owner_uid BIGINT NOT NULL COMMENT '号主用户ID',
  username_enc TEXT NOT NULL COMMENT '账号名 AES-256-GCM 加密',
  pwd_enc TEXT NOT NULL COMMENT '密码 AES-256-GCM 加密',
  iv VARCHAR(32) NOT NULL COMMENT '初始化向量',
  lvl INT COMMENT '账号等级',
  skins JSON COMMENT '皮肤信息（JSON格式）',
  deposit DECIMAL(10,2) NOT NULL COMMENT '固定押金',
  price_30min DECIMAL(10,2) NOT NULL COMMENT '30分钟价格',
  price_1h DECIMAL(10,2) NOT NULL COMMENT '1小时价格',
  price_overnight DECIMAL(10,2) NOT NULL COMMENT '包夜价格',
  status TINYINT DEFAULT 1 COMMENT '1-上架 2-下架 3-租赁中',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES game(id),
  FOREIGN KEY (owner_uid) REFERENCES user(id),
  INDEX idx_game_status (game_id, status),
  INDEX idx_owner (owner_uid),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账号表';

-- 租赁订单表
CREATE TABLE IF NOT EXISTS lease_order (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL COMMENT '账号ID',
  tenant_uid BIGINT NOT NULL COMMENT '租客用户ID',
  start_time TIMESTAMP NOT NULL COMMENT '租期开始时间',
  end_time TIMESTAMP NOT NULL COMMENT '租期结束时间',
  actual_end_time TIMESTAMP NULL COMMENT '实际结束时间',
  amount DECIMAL(10,2) NOT NULL COMMENT '租金',
  deposit DECIMAL(10,2) NOT NULL COMMENT '押金',
  status ENUM('paying', 'leasing', 'closed', 'appeal', 'cancelled') DEFAULT 'paying' COMMENT '订单状态',
  evidence_hash VARCHAR(64) COMMENT '还号证据哈希（SHA-256）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES account(id),
  FOREIGN KEY (tenant_uid) REFERENCES user(id),
  INDEX idx_tenant_status (tenant_uid, status),
  INDEX idx_account_time (account_id, start_time, end_time),
  INDEX idx_status_time (status, end_time) COMMENT '用于定时任务查询'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租赁订单表';

-- 支付记录表
CREATE TABLE IF NOT EXISTS payment_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL COMMENT '订单ID',
  payment_type ENUM('wechat', 'alipay') NOT NULL COMMENT '支付方式',
  amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
  transaction_id VARCHAR(64) UNIQUE COMMENT '第三方交易号',
  status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL COMMENT '支付完成时间',
  FOREIGN KEY (order_id) REFERENCES lease_order(id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status_time (status, created_at),
  INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';

-- 申诉表
CREATE TABLE IF NOT EXISTS appeal (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL COMMENT '订单ID',
  type TINYINT NOT NULL COMMENT '申诉类型：1-账号异常 2-押金争议 3-其他 4-玩家恶意使用/销毁资源 5-买家脚本盗号',
  evidence_urls JSON COMMENT '证据URL列表（JSON数组）',
  verdict TINYINT COMMENT '裁决结果：1-支持租客 2-支持号主 3-各担一半',
  operator_uid BIGINT COMMENT '处理人用户ID',
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolve_time TIMESTAMP NULL COMMENT '处理完成时间',
  FOREIGN KEY (order_id) REFERENCES lease_order(id),
  INDEX idx_order_id (order_id),
  INDEX idx_status (verdict)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='申诉表';

-- 日志审计表
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT COMMENT '操作用户ID（可为空，如系统操作）',
  username VARCHAR(50) COMMENT '操作用户名（冗余字段，便于查询）',
  role VARCHAR(20) COMMENT '用户角色：TENANT/OWNER/OPERATOR',
  action VARCHAR(100) NOT NULL COMMENT '操作类型：LOGIN/LOGOUT/CREATE_ORDER/PAYMENT/APPEAL_RESOLVE/USER_FREEZE/USER_UNFREEZE/ACCOUNT_CREATE/ACCOUNT_UPDATE/ACCOUNT_DELETE等',
  resource_type VARCHAR(50) COMMENT '资源类型：USER/ORDER/ACCOUNT/APPEAL/PAYMENT等',
  resource_id BIGINT COMMENT '资源ID',
  description TEXT COMMENT '操作描述',
  request_method VARCHAR(10) COMMENT 'HTTP请求方法：GET/POST/PUT/DELETE等',
  request_path VARCHAR(500) COMMENT '请求路径',
  request_params TEXT COMMENT '请求参数（JSON格式）',
  response_status INT COMMENT '响应状态码',
  ip_address VARCHAR(50) COMMENT '客户端IP地址',
  user_agent VARCHAR(500) COMMENT '用户代理（浏览器信息）',
  success TINYINT(1) DEFAULT 1 COMMENT '操作是否成功：1-成功 0-失败',
  error_message TEXT COMMENT '错误信息（失败时记录）',
  execution_time INT COMMENT '执行耗时（毫秒）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  INDEX idx_user_action_time (user_id, action, created_at),
  INDEX idx_role_action (role, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日志审计表';

-- 插入初始游戏数据
INSERT IGNORE INTO game (name, publisher, login_type, status) VALUES
('英雄联盟', 'Riot Games', 'pwd', 1),
('王者荣耀', '腾讯游戏', 'qr', 1),
('原神', 'miHoYo', 'pwd', 1);


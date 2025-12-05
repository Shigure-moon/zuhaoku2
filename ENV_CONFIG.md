# 环境变量配置说明

项目完全通过环境变量配置，所有敏感信息都不应出现在代码中。

## 必需的环境变量

### 数据库配置

| 变量名 | 说明 | 示例值 |
|:---|:---|:---|
| `MYSQL_HOST` | 数据库主机地址 | `mysql2.sqlpub.com` |
| `MYSQL_PORT` | 数据库端口 | `3307` |
| `MYSQL_DATABASE` | 数据库名称 | `zuhaoku` |
| `MYSQL_USER` | 数据库用户名 | `shigure2` |
| `MYSQL_PASSWORD` | 数据库密码 | `***` |

### 支付宝配置

| 变量名 | 说明 | 格式要求 |
|:---|:---|:---|
| `ALIPAY_APP_ID` | 支付宝应用ID | 从支付宝开放平台获取 |
| `ALIPAY_GATEWAY` | 支付宝网关地址 | `https://openapi.alipay.com/gateway.do` |
| `ALIPAY_PRIVATE_KEY_PKCS1` | 应用私钥（PKCS#1格式，推荐） | `-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----` |
| `ALIPAY_PRIVATE_KEY` | 应用私钥（PKCS#8格式，备用） | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥 | Base64字符串（不含BEGIN/END标记） |
| `ALIPAY_NOTIFY_URL` | 异步通知地址 | HTTPS URL |
| `ALIPAY_RETURN_URL` | 同步跳转地址 | HTTPS URL |

**注意**：
- 优先使用 `ALIPAY_PRIVATE_KEY_PKCS1`（PKCS#1格式）
- 如果没有设置 `ALIPAY_PRIVATE_KEY_PKCS1`，则使用 `ALIPAY_PRIVATE_KEY`（PKCS#8格式）
- 私钥中的换行符使用 `\n` 表示

### 应用配置

| 变量名 | 说明 | 默认值 |
|:---|:---|:---|
| `PORT` | 服务器端口 | `8080` |
| `SPRING_PROFILES_ACTIVE` | Spring环境 | `prod` |
| `JWT_SECRET` | JWT密钥 | 必需，至少32字符 |
| `ENCRYPTION_KEY` | 加密密钥 | 必需，至少32字符 |
| `ENCRYPTION_MASTER_KEY` | 主加密密钥 | 必需，至少32字符 |
| `BACKEND_URL` | 后端服务地址 | 必需 |
| `FRONTEND_URL` | 前端服务地址 | 必需 |

## 可选的环境变量

### Redis 配置（可选）

如果不配置 Redis，应用会自动禁用 Redis 相关功能。

| 变量名 | 说明 | 默认值 |
|:---|:---|:---|
| `REDIS_HOST` | Redis主机地址 | 空（禁用） |
| `REDIS_PORT` | Redis端口 | `6379` |
| `REDIS_PASSWORD` | Redis密码 | 空 |

### MinIO 配置（可选）

如果不配置 MinIO，文件上传功能将不可用。

| 变量名 | 说明 |
|:---|:---|
| `MINIO_ENDPOINT` | MinIO服务地址 |
| `MINIO_ACCESS_KEY` | MinIO访问密钥 |
| `MINIO_SECRET_KEY` | MinIO密钥 |
| `MINIO_BUCKET` | MinIO存储桶名称 |

## 配置方式

### Zeabur / Railway 等平台

在平台的环境变量设置页面直接添加所有必需的环境变量。

### Docker

```bash
docker run -d -p 8080:8080 \
  -e MYSQL_HOST=... \
  -e MYSQL_PASSWORD=... \
  # ... 其他环境变量
  zuhaoku:latest
```

### 本地开发

创建 `.env` 文件（参考 `env.example`），应用会自动加载。

## 支付宝密钥生成

1. 运行密钥生成脚本：
   ```bash
   cd alipay-keys
   bash generate-alipay-keys.sh
   ```

2. 上传应用公钥到支付宝开放平台

3. 使用 `setup-alipay-config.sh` 生成环境变量配置

## 验证配置

启动应用后，检查日志确认：
- ✅ 数据库连接成功
- ✅ 支付宝客户端初始化成功
- ✅ 私钥格式验证通过

## 安全提示

1. **不要将敏感信息提交到代码仓库**
2. **使用环境变量或密钥管理服务存储密钥**
3. **生产环境必须使用 HTTPS**
4. **定期轮换密钥**

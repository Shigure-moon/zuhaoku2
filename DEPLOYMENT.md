# 部署指南

## 快速部署

### 1. 准备环境变量

参考 [ENV_CONFIG.md](./ENV_CONFIG.md) 配置所有必需的环境变量。

### 2. 部署到 Zeabur

1. 连接 GitHub 仓库
2. 选择项目根目录
3. 在环境变量设置页面添加所有必需的环境变量
4. 部署

### 3. 验证部署

访问健康检查端点：`https://your-domain.com/health`

查看应用日志确认：
- ✅ 数据库连接成功
- ✅ 支付宝客户端初始化成功
- ✅ 应用启动成功

## 支付宝配置

### 生成密钥

```bash
cd alipay-keys
bash generate-alipay-keys.sh
```

### 上传公钥

1. 登录 [支付宝开放平台](https://open.alipay.com/)
2. 进入应用管理 -> 接口加签方式
3. 上传生成的应用公钥字符串

### 配置环境变量

使用 `setup-alipay-config.sh` 生成环境变量配置：

```bash
# 设置环境变量后运行
bash setup-alipay-config.sh
```

## 故障排查

### 数据库连接失败

检查 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD` 是否正确。

### 支付宝支付失败

- 检查 `ALIPAY_PRIVATE_KEY_PKCS1` 格式是否正确
- 确认私钥中的换行符使用 `\n` 表示
- 检查 `ALIPAY_PUBLIC_KEY` 是否正确
- 确认回调地址是公网可访问的 HTTPS URL

### 应用启动失败

- 检查所有必需的环境变量是否已设置
- 查看应用日志获取详细错误信息
- 确认 `SPRING_PROFILES_ACTIVE=prod`

## 详细配置说明

完整的环境变量说明请参考 [ENV_CONFIG.md](./ENV_CONFIG.md)

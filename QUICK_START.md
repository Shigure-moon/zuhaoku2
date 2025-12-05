# 快速启动

## 部署步骤

1. **配置环境变量** - 参考 [ENV_CONFIG.md](./ENV_CONFIG.md)
2. **部署到平台** - Zeabur / Railway / Docker
3. **验证部署** - 访问健康检查端点

## 环境变量配置

所有配置通过环境变量完成，详细说明请参考 [ENV_CONFIG.md](./ENV_CONFIG.md)

## 支付宝配置

1. 运行 `alipay-keys/generate-alipay-keys.sh` 生成密钥
2. 上传公钥到支付宝开放平台
3. 使用 `alipay-keys/setup-alipay-config.sh` 生成环境变量

## 获取帮助

- [环境变量配置](./ENV_CONFIG.md) - 环境变量详细说明
- [部署指南](./DEPLOYMENT.md) - 部署详细步骤

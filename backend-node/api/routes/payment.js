import express from 'express';
import pool from '../db.js';
import { AlipaySdk } from 'alipay-sdk';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ========== 支付宝密钥格式化函数（完全参考 myblog 的实现） ==========

// 格式化密钥（处理换行符和格式）
const formatKey = (key) => {
  if (!key) return null;
  
  // 替换转义的换行符
  let formatted = key.replace(/\\n/g, '\n');
  
  // 确保每行都有正确的换行符
  formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 移除多余的空行
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // 移除首尾空白
  formatted = formatted.trim();
  
  // 确保最后有换行符
  if (!formatted.endsWith('\n')) {
    formatted += '\n';
  }

  // 如果是单行（或几乎单行）PEM，把中间的 base64 部分重新按 64 字符换行
  // 兼容 PKCS#1 和 PKCS#8 两种私钥头
  const wrapPemBody = (pem, beginMarker, endMarker) => {
    const beginIndex = pem.indexOf(beginMarker);
    const endIndex = pem.indexOf(endMarker);
    if (beginIndex === -1 || endIndex === -1) return pem;

    const header = beginMarker;
    const footer = endMarker;

    // 提取 header 和 footer 中间的内容
    const body = pem
      .slice(beginIndex + beginMarker.length, endIndex)
      .replace(/\s+/g, ''); // 去掉所有空白

    // 如果已经有多行（长度明显大于 64 且本身包含换行），就不处理
    if (body.includes('\n')) return pem;

    const wrappedBody = (body.match(/.{1,64}/g) || [body]).join('\n');
    return `${header}\n${wrappedBody}\n${footer}\n`;
  };

  if (formatted.includes('BEGIN RSA PRIVATE KEY')) {
    formatted = wrapPemBody(
      formatted,
      '-----BEGIN RSA PRIVATE KEY-----',
      '-----END RSA PRIVATE KEY-----'
    );
  } else if (formatted.includes('BEGIN PRIVATE KEY')) {
    formatted = wrapPemBody(
      formatted,
      '-----BEGIN PRIVATE KEY-----',
      '-----END PRIVATE KEY-----'
    );
  }
  
  return formatted;
};

// 测试私钥是否可以被crypto模块正确解析
const testPrivateKey = (privateKey) => {
  try {
    const formatted = formatKey(privateKey);
    
    // 检查私钥格式
    const isPKCS1 = formatted.includes('BEGIN RSA PRIVATE KEY');
    const isPKCS8 = formatted.includes('BEGIN PRIVATE KEY');
    
    if (!isPKCS1 && !isPKCS8) {
      console.error('✗ 私钥格式未知，必须包含 BEGIN RSA PRIVATE KEY 或 BEGIN PRIVATE KEY');
      return false;
    }
    
    // 尝试使用crypto模块创建Sign对象
    const sign = crypto.createSign('RSA-SHA256');
    sign.update('test');
    
    // 尝试签名（这会验证私钥格式）
    const signature = sign.sign(formatted, 'base64');
    
    if (signature) {
      console.log('✓ 私钥格式验证通过，可以正常签名');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ 私钥格式验证失败:', error.message);
    return false;
  }
};

// 验证私钥格式（基本检查）
const validatePrivateKey = (key) => {
  if (!key) return false;
  
  const formatted = formatKey(key);
  
  // 检查是否包含私钥标记（支持两种格式）
  const hasRSAKey = formatted.includes('BEGIN RSA PRIVATE KEY');
  const hasPrivateKey = formatted.includes('BEGIN PRIVATE KEY');
  
  if (!hasRSAKey && !hasPrivateKey) {
    console.error('私钥格式错误：缺少BEGIN标记');
    return false;
  }
  
  // 检查是否有END标记
  if (!formatted.includes('END')) {
    console.error('私钥格式错误：缺少END标记');
    return false;
  }
  
  return true;
};

// 格式化支付宝公钥（支付宝公钥可能没有BEGIN/END标记）
const formatAlipayPublicKey = (key) => {
  if (!key) return null;
  
  let formatted = formatKey(key);
  
  // 如果公钥没有BEGIN/END标记，添加它们
  // 支付宝公钥通常是纯base64字符串，需要添加PEM标记
  if (!formatted.includes('BEGIN')) {
    // 移除所有换行符，然后每64个字符换行（PEM格式标准）
    const base64Content = formatted.replace(/\n/g, '').replace(/\s/g, '');
    // 每64个字符换行
    const wrappedContent = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
    formatted = `-----BEGIN PUBLIC KEY-----\n${wrappedContent}\n-----END PUBLIC KEY-----`;
  }
  
  return formatted;
};

// 初始化支付宝SDK（完全参考 myblog 的实现）
const getAlipaySdk = () => {
  const appId = process.env.ALIPAY_APP_ID;
  const privateKeyPkcs1 = process.env.ALIPAY_PRIVATE_KEY_PKCS1; // 推荐直接配置PKCS#1
  const privateKeyPkcs8 = process.env.ALIPAY_PRIVATE_KEY;
  const privateKey = privateKeyPkcs1 || privateKeyPkcs8;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
  const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';

  if (!appId || !privateKey || !alipayPublicKey) {
    console.warn('支付宝配置未完整，请检查环境变量');
    console.warn('需要: ALIPAY_APP_ID, (ALIPAY_PRIVATE_KEY_PKCS1 或 ALIPAY_PRIVATE_KEY), ALIPAY_PUBLIC_KEY');
    return null;
  }

  // 格式化密钥
  let formattedPrivateKey = formatKey(privateKey);
  const formattedPublicKey = formatAlipayPublicKey(alipayPublicKey);

  // 验证私钥格式
  if (!validatePrivateKey(privateKey)) {
    console.error('私钥格式验证失败，请检查环境变量 ALIPAY_PRIVATE_KEY_PKCS1 / ALIPAY_PRIVATE_KEY');
    return null;
  }

  // 测试私钥是否可以被crypto模块正确解析
  console.log('正在测试私钥格式...');
  if (!testPrivateKey(privateKey)) {
    console.error('私钥无法被crypto模块解析');
    console.error('请检查环境变量 ALIPAY_PRIVATE_KEY_PKCS1 或 ALIPAY_PRIVATE_KEY 的配置');
    return null;
  }
  
  // 使用格式化后的私钥
  formattedPrivateKey = formatKey(privateKey);

  try {
    console.log('正在初始化支付宝SDK...');
    console.log('App ID:', appId);
    console.log('Gateway:', gateway);
    console.log('私钥来源:', privateKeyPkcs1 ? 'ALIPAY_PRIVATE_KEY_PKCS1' : 'ALIPAY_PRIVATE_KEY');
    console.log('私钥格式:', formattedPrivateKey.includes('BEGIN RSA PRIVATE KEY') ? 'PKCS#1' : 'PKCS#8');
    console.log('公钥格式:', formattedPublicKey.includes('BEGIN PUBLIC KEY') ? 'PEM' : '未知');
    
    const sdk = new AlipaySdk({
      appId,
      privateKey: formattedPrivateKey,
      alipayPublicKey: formattedPublicKey,
      gateway,
      signType: 'RSA2',
      charset: 'utf-8',
      version: '1.0',
      timeout: 5000,
    });
    
    console.log('✓ 支付宝SDK初始化成功');
    return sdk;
  } catch (error) {
    console.error('✗ 初始化支付宝SDK失败:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('请检查密钥格式是否正确');
    return null;
  }
};

// ========== 支付相关路由 ==========

// 创建支付（租号酷业务逻辑）
router.post('/alipay/create', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ 
        code: 400,
        message: '订单ID不能为空',
        data: null,
        timestamp: Date.now()
      });
    }

    // 查询订单
    const [orders] = await pool.query(
      'SELECT * FROM lease_order WHERE id = ? AND tenant_uid = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ 
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now()
      });
    }

    const order = orders[0];

    // 检查订单状态
    if (order.status !== 'paying') {
      return res.status(400).json({ 
        code: 400,
        message: '订单状态不正确，无法支付',
        data: null,
        timestamp: Date.now()
      });
    }

    // 查询或创建支付记录
    const [existingPayments] = await pool.query(
      'SELECT * FROM payment_record WHERE order_id = ? AND payment_type = ? AND status = ?',
      [orderId, 'alipay', 'pending']
    );

    let payment;
    if (existingPayments.length > 0) {
      payment = existingPayments[0];
    } else {
      const transactionId = 'ALIPAY' + Date.now() + orderId;
      const totalAmount = parseFloat(order.amount) + parseFloat(order.deposit || 0);
      
      const [result] = await pool.query(
        'INSERT INTO payment_record (order_id, payment_type, amount, status, transaction_id) VALUES (?, ?, ?, ?, ?)',
        [orderId, 'alipay', totalAmount, 'pending', transactionId]
      );
      
      payment = {
        id: result.insertId,
        order_id: orderId,
        payment_type: 'alipay',
        amount: totalAmount,
        status: 'pending',
        transaction_id: transactionId
      };
    }

    // 获取支付宝SDK
    const alipaySdk = getAlipaySdk();
    if (!alipaySdk) {
      return res.status(500).json({ 
        code: 500,
        message: '支付服务未配置',
        data: null,
        timestamp: Date.now()
      });
    }

    // 构建支付参数（移除押金，总金额只包含租金）
    const totalAmount = parseFloat(order.amount || 0);
    const bizContent = {
      out_trade_no: payment.transaction_id,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: totalAmount.toFixed(2),
      subject: '租号酷-账号租赁',
      body: `订单号: ${order.id}, 账号: ${order.account_id}`,
      timeout_express: '30m',
    };

    // 使用 pageExecute 方法生成支付页面（完全参考 myblog 的实现）
    try {
      // 同步回调 URL：应该指向后端路由，后端再重定向到前端
      const returnUrl = process.env.ALIPAY_RETURN_URL || `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/v1/payments/alipay/return`;
      // 异步通知 URL：直接指向后端路由
      const notifyUrl = process.env.ALIPAY_NOTIFY_URL || `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/v1/payments/alipay/notify`;

      console.log('调用支付宝 pageExecute，参数:', {
        method: 'alipay.trade.page.pay',
        out_trade_no: bizContent.out_trade_no,
        total_amount: bizContent.total_amount,
        returnUrl: returnUrl,
        notifyUrl: notifyUrl,
        bizContent_type: typeof bizContent,
        bizContent_preview: JSON.stringify(bizContent).substring(0, 100)
      });

      // 调用 pageExecute（完全参考 myblog 的实现）
      // myblog 的实现方式：
      // const result = await alipaySdk.pageExecute(
      //   'alipay.trade.page.pay',
      //   {
      //     bizContent: { ... },
      //     returnUrl: '...',
      //     notifyUrl: '...',
      //   },
      //   { method: 'POST' }
      // );
      // 参数说明：
      // 1. 第一个参数：方法名 'alipay.trade.page.pay'
      // 2. 第二个参数：业务参数对象，包含 bizContent, returnUrl, notifyUrl
      // 3. 第三个参数：选项对象，包含 method: 'POST' 或 'GET'
      // 注意：pageExecute 可能是异步方法，使用 await
      const result = await alipaySdk.pageExecute(
        'alipay.trade.page.pay', // 方法名（必须）
        {
          // 业务参数（对象，SDK 会自动转换为 JSON 字符串）
          bizContent: {
            out_trade_no: bizContent.out_trade_no,
            product_code: bizContent.product_code,
            total_amount: bizContent.total_amount,
            subject: bizContent.subject,
            body: bizContent.body,
            timeout_express: bizContent.timeout_express,
          },
          returnUrl: returnUrl,   // 同步回调地址
          notifyUrl: notifyUrl,   // 异步通知地址
        },
        { method: 'POST' }        // HTTP 方法选项（生成 POST 表单）
      );
      
      console.log('支付宝 pageExecute 调用成功，返回结果长度:', result ? result.length : 0);
      
      // 检查生成的 HTML 表单格式
      // 根据支付宝错误提示："请确认charset参数放在了URL查询字符串中且各参数值使用charset参数指示的字符集编码"
      // POST 表单的格式应该是：
      // - 平台参数（method, app_id, charset, version, sign_type, timestamp, sign）在 URL 的 query string 中
      // - 业务参数（biz_content）在 POST body 中（作为 hidden input）
      if (result && typeof result === 'string') {
        // 解析 action URL
        const actionMatch = result.match(/action="([^"]+)"/);
        const actionUrl = actionMatch ? actionMatch[1] : '';
        
        // 检查 URL 中的平台参数
        const urlParams = new URLSearchParams(actionUrl.split('?')[1] || '');
        const methodInUrl = urlParams.get('method');
        const appIdInUrl = urlParams.get('app_id');
        const charsetInUrl = urlParams.get('charset');
        const signInUrl = urlParams.get('sign');
        
        // 检查 hidden input 中的参数
        const bizContentInput = result.match(/<input[^>]*name=["']biz_content["'][^>]*value=["']([^"']+)["']/);
        const methodInput = result.match(/<input[^>]*name=["']method["'][^>]*value=["']([^"']+)["']/);
        
        console.log('生成的 HTML 表单检查:', {
          actionUrl: actionUrl.substring(0, 200) + (actionUrl.length > 200 ? '...' : ''),
          methodInUrl: methodInUrl || '未找到',
          appIdInUrl: appIdInUrl || '未找到',
          charsetInUrl: charsetInUrl || '未找到',
          signInUrl: signInUrl ? (signInUrl.substring(0, 50) + '...') : '未找到',
          bizContentInBody: bizContentInput ? '已找到' : '未找到',
          methodInBody: methodInput ? '已找到（不应该在body中）' : '未找到（正确）',
          formPreview: result.substring(0, 800) // 显示前800字符
        });
        
        // 如果 method 在 body 中但不在 URL 中，这是错误的
        if (methodInput && !methodInUrl) {
          console.error('⚠️ 错误：method 参数在 POST body 中，但不在 URL 中！');
          console.error('这会导致签名验证失败，因为签名是基于 URL 参数计算的');
        }
        
        // 如果 charset 不在 URL 中，这也是错误的
        if (!charsetInUrl) {
          console.error('⚠️ 错误：charset 参数不在 URL 的 query string 中！');
          console.error('根据支付宝要求，charset 必须在 URL 中');
        }
        
        // 输出完整的 HTML 表单用于调试
        console.log('完整的 HTML 表单:', result);
      }
      
      // 使用 SDK 生成的原始表单
      const finalResult = result;

      // result 为 HTML 表单，返回给前端
      res.json({
        code: 200,
        message: '操作成功',
        data: {
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          paymentUrl: finalResult || result, // HTML 表单（如果修复了则使用修复后的版本）
        },
        timestamp: Date.now()
      });
    } catch (sdkError) {
      console.error('支付宝SDK调用错误:', sdkError);
      console.error('错误详情:', {
        message: sdkError.message,
        stack: sdkError.stack,
        library: sdkError.library,
        reason: sdkError.reason
      });
      
      // 如果是密钥格式错误，提供更详细的提示
      if (sdkError.message && sdkError.message.includes('DECODER')) {
        console.error('私钥格式错误，请检查:');
        console.error('1. 私钥是否包含 "-----BEGIN RSA PRIVATE KEY-----" 或 "-----BEGIN PRIVATE KEY-----"');
        console.error('2. 私钥中的换行符是否正确（使用 \\n 或实际换行）');
        console.error('3. 私钥是否完整（包含BEGIN和END标记）');
        return res.status(500).json({ 
          code: 500,
          message: '支付页面生成失败：私钥格式不正确',
          data: null,
          timestamp: Date.now()
        });
      }
      
      throw sdkError;
    }
  } catch (error) {
    console.error('创建支付错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '创建支付失败: ' + error.message,
      data: null,
      timestamp: Date.now()
    });
  }
});

// 支付宝异步通知回调（完全参考 myblog 的实现）
router.post('/alipay/notify', async (req, res) => {
  try {
    const alipaySdk = getAlipaySdk();
    if (!alipaySdk) {
      return res.status(500).send('fail');
    }

    const notifyData = req.body;
    const sign = notifyData.sign;
    const signType = notifyData.sign_type || 'RSA2';

    // 验证签名 - 使用SDK的verify方法
    const params = { ...notifyData };
    delete params.sign;
    delete params.sign_type;

    // 构建待签名字符串
    const sortedKeys = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .sort();
    
    const signContent = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&');

    // 使用crypto验证签名
    const formattedPublicKey = formatAlipayPublicKey(process.env.ALIPAY_PUBLIC_KEY);
    if (!formattedPublicKey) {
      console.error('支付宝公钥格式错误');
      return res.send('fail');
    }
    
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signContent, 'utf8');
    const verifyResult = verify.verify(
      formattedPublicKey,
      sign,
      'base64'
    );

    if (!verifyResult) {
      console.error('支付宝签名验证失败');
      console.error('签名内容:', signContent);
      return res.send('fail');
    }

    // 保存支付记录（根据表结构：order_id, payment_type, transaction_id, status, amount, paid_at）
    const paymentStatus = notifyData.trade_status === 'TRADE_SUCCESS' || notifyData.trade_status === 'TRADE_FINISHED' ? 'success' : 'failed';
    
    // 查询支付记录（通过 transaction_id）
    const [existingPayments] = await pool.query(
      'SELECT * FROM payment_record WHERE transaction_id = ?',
      [notifyData.out_trade_no]
    );

    if (existingPayments.length > 0) {
      // 更新现有支付记录
      const payment = existingPayments[0];
      await pool.query(
        `UPDATE payment_record 
         SET status = ?, paid_at = NOW() 
         WHERE id = ?`,
        [paymentStatus, payment.id]
      );
      console.log(`[异步通知] 支付记录 ${payment.id} 已更新: ${payment.status} -> ${paymentStatus}`);
    } else {
      // 创建新支付记录（需要先通过 transaction_id 找到订单）
      // transaction_id 格式通常是 ALIPAY + timestamp + order_id
      // 尝试从 transaction_id 中提取 order_id，或者通过其他方式查找
      const [orders] = await pool.query(
        `SELECT o.id as order_id 
         FROM lease_order o 
         JOIN payment_record p ON p.order_id = o.id 
         WHERE p.transaction_id LIKE ? 
         LIMIT 1`,
        [`%${notifyData.out_trade_no}%`]
      );
      
      if (orders.length === 0) {
        // 如果找不到，尝试通过其他方式（比如查询最近的订单）
        console.warn(`[异步通知] 未找到对应的订单，支付记录可能已存在或订单不存在: ${notifyData.out_trade_no}`);
      } else {
        await pool.query(
          `INSERT INTO payment_record 
           (order_id, payment_type, transaction_id, status, amount, paid_at) 
           VALUES (?, 'alipay', ?, ?, ?, NOW())`,
          [
            orders[0].order_id,
            notifyData.out_trade_no,
            paymentStatus,
            notifyData.total_amount,
          ]
        );
        console.log(`[异步通知] 新支付记录已创建: ${notifyData.out_trade_no}`);
      }
    }

    // 处理支付成功（确保状态更新逻辑健壮）
    if (notifyData.trade_status === 'TRADE_SUCCESS' || notifyData.trade_status === 'TRADE_FINISHED') {
      const orderNo = notifyData.out_trade_no;
      const tradeNo = notifyData.trade_no;
      console.log(`[异步通知] 收到支付成功通知，订单号: ${orderNo}, 支付宝交易号: ${tradeNo}`);

      // 使用事务确保数据一致性
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 查询支付记录对应的订单
        const [payments] = await connection.query(
          'SELECT * FROM payment_record WHERE transaction_id = ? FOR UPDATE',
          [orderNo]
        );

        if (payments.length === 0) {
          console.error(`[异步通知] 支付记录不存在: ${orderNo}`);
          await connection.rollback();
          return res.send('fail');
        }

        const payment = payments[0];

        // 检查订单状态，避免重复处理
        const [orders] = await connection.query(
          'SELECT * FROM lease_order WHERE id = ? FOR UPDATE',
          [payment.order_id]
        );

        if (orders.length === 0) {
          console.error(`[异步通知] 订单不存在: ${payment.order_id}`);
          await connection.rollback();
          return res.send('fail');
        }

        const order = orders[0];

        // 如果订单已经是 leasing 状态，说明已经处理过，直接返回成功
        if (order.status === 'leasing') {
          console.log(`[异步通知] 订单 ${payment.order_id} 已经是 leasing 状态，跳过处理`);
          // 但还是要更新支付记录状态（如果还没更新）
          if (payment.status !== 'success') {
            await connection.query(
              'UPDATE payment_record SET status = ?, paid_at = NOW() WHERE id = ?',
              ['success', payment.id]
            );
          }
          await connection.commit();
          return res.send('success');
        }

        // 只有 paying 状态的订单才需要更新
        if (order.status !== 'paying') {
          console.warn(`[异步通知] 订单 ${payment.order_id} 状态是 ${order.status}，不是 paying，跳过状态更新`);
          // 但还是要更新支付记录状态
          if (payment.status !== 'success') {
            await connection.query(
              'UPDATE payment_record SET status = ?, paid_at = NOW() WHERE id = ?',
              ['success', payment.id]
            );
          }
          await connection.commit();
          return res.send('success');
        }

        // 更新订单状态为租赁中
        await connection.query(
          'UPDATE lease_order SET status = ?, updated_at = NOW() WHERE id = ?',
          ['leasing', payment.order_id]
        );
        console.log(`[异步通知] 订单 ${payment.order_id} 状态已更新为 leasing`);
        
        // 更新账号状态为租赁中
        if (order.account_id) {
          await connection.query(
            'UPDATE account SET status = ? WHERE id = ?',
            [3, order.account_id] // 3 表示租赁中
          );
          console.log(`[异步通知] 账号 ${order.account_id} 状态已更新为租赁中`);
        }

        // 更新支付记录状态
        await connection.query(
          'UPDATE payment_record SET status = ?, paid_at = NOW() WHERE id = ?',
          ['success', payment.id]
        );
        console.log(`[异步通知] 支付记录 ${payment.id} 状态已更新为 success`);

        await connection.commit();
        console.log(`[异步通知] ✅ 订单 ${payment.order_id} 处理完成，所有状态已更新`);
      } catch (error) {
        await connection.rollback();
        console.error(`[异步通知] 处理订单 ${orderNo} 时发生错误:`, error);
        throw error;
      } finally {
        connection.release();
      }
    }

    res.send('success');
  } catch (error) {
    console.error('处理支付通知错误:', error);
    res.send('fail');
  }
});

// 主动查询支付宝订单状态（参考 myblog 的实现）
export const queryAlipayTradeStatus = async (orderNo) => {
  try {
    const alipaySdk = getAlipaySdk();
    if (!alipaySdk) {
      console.error('支付宝SDK未初始化，无法查询订单状态');
      return null;
    }

    // exec 方法需要传递 bizContent 参数，新版SDK要求是对象而非JSON字符串
    const result = await alipaySdk.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: orderNo
      }
    });

    console.log('查询支付宝订单状态响应:', JSON.stringify(result, null, 2));

    // Alipay SDK exec 返回格式可能是：
    // { alipayTradeQueryResponse: { code: '10000', msg: 'Success', ... } }
    // 或者扁平化格式：{ code: '10000', msg: 'Success', ... }
    const response = result.alipayTradeQueryResponse || result;

    if (response && response.code === '10000') {
      // 检查交易状态
      const tradeStatus = response.tradeStatus || response.trade_status;
      if (tradeStatus) {
        return {
          tradeStatus: tradeStatus,
          tradeNo: response.tradeNo || response.trade_no,
          totalAmount: response.totalAmount || response.total_amount,
          buyerUserId: response.buyerUserId || response.buyer_user_id,
          buyerLogonId: response.buyerLogonId || response.buyer_logon_id,
          outTradeNo: response.outTradeNo || response.out_trade_no
        };
      } else {
        console.log('订单状态为空:', response);
        return null;
      }
    } else {
      // 订单不存在或其他错误
      console.log('查询支付宝订单状态失败:', response?.msg || response?.subMsg || '未知错误', response);
      return null;
    }
  } catch (error) {
    console.error('查询支付宝订单状态异常:', error);
    return null;
  }
};

// 处理支付成功（更新订单状态和账号状态）
export const handlePaymentSuccess = async (order, alipayTradeNo) => {
  try {
    console.log(`[支付成功处理] 订单ID: ${order.id}, 账号ID: ${order.account_id}`);
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 更新订单状态为租赁中
      await connection.query(
        'UPDATE lease_order SET status = ?, updated_at = NOW() WHERE id = ?',
        ['leasing', order.id]
      );
      console.log(`[支付成功处理] 订单状态已更新为 leasing`);

      // 更新账号状态为租赁中
      if (order.account_id) {
        await connection.query(
          'UPDATE account SET status = ? WHERE id = ?',
          [3, order.account_id] // 3 表示租赁中
        );
        console.log(`[支付成功处理] 账号 ${order.account_id} 状态已更新为租赁中`);
      }

      // 更新支付记录状态
      const [payments] = await connection.query(
        'SELECT * FROM payment_record WHERE order_id = ?',
        [order.id]
      );
      
      if (payments.length > 0) {
        const payment = payments[0];
        await connection.query(
          'UPDATE payment_record SET status = ?, paid_at = NOW() WHERE id = ?',
          ['success', payment.id]
        );
        
        // 如果有 alipay_trade_no 字段，更新它
        try {
          await connection.query(
            'UPDATE payment_record SET alipay_trade_no = ? WHERE id = ?',
            [alipayTradeNo, payment.id]
          );
        } catch (e) {
          // 如果字段不存在，忽略错误
          if (!e.message.includes('Unknown column')) {
            throw e;
          }
        }
        
        console.log(`[支付成功处理] 支付记录 ${payment.id} 状态已更新为 success`);
      }

      await connection.commit();
      console.log(`[支付成功处理] ✅ 订单 ${order.id} 处理完成`);
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[支付成功处理] 处理失败:', error);
    console.error('[支付成功处理] 错误堆栈:', error.stack);
    return false;
  }
};

// 支付宝同步通知回调（完全参考 myblog 的实现：只负责重定向，不做业务处理）
router.get('/alipay/return', (req, res) => {
  // 重定向到前端页面，由前端检查支付状态
  const orderNo = req.query.out_trade_no;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  if (orderNo) {
    // 将订单号传递给前端，由前端主动检查支付状态
    res.redirect(`${frontendUrl}/tenant/orders?orderNo=${orderNo}`);
  } else {
    res.redirect(`${frontendUrl}/tenant/orders`);
  }
});

export default router;


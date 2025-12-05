import request from './request'
import type { CreatePaymentDTO, Payment } from '@/types/payment'

// 创建支付
export const createPayment = (data: CreatePaymentDTO) => {
  // 根据支付类型选择不同的路由
  if (data.paymentType === 'alipay') {
    return request.post<Payment>('/payments/alipay/create', { orderId: data.orderId })
  } else if (data.paymentType === 'wechat') {
    // TODO: 实现微信支付
    return Promise.reject(new Error('微信支付暂未实现'))
  } else {
    return Promise.reject(new Error('不支持的支付方式'))
  }
}

// 查询支付状态
export const getPaymentStatus = (id: number) => {
  return request.get<Payment>(`/payments/${id}/status`)
}


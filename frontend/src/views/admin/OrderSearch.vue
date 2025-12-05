<template>
  <div class="order-search">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单查询</span>
        </div>
      </template>

      <!-- 搜索表单 -->
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="订单号">
          <el-input
            v-model="searchOrderNo"
            placeholder="请输入订单号（如：ORD0000000020）"
            style="width: 300px"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :loading="loading">查询</el-button>
        </el-form-item>
      </el-form>

      <!-- 订单详情 -->
      <div v-if="orderDetail" class="order-detail-container">
        <!-- 订单基本信息 -->
        <el-descriptions title="订单信息" :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="订单号">{{ orderDetail.order.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="getStatusType(orderDetail.order.status)">
              {{ getStatusText(orderDetail.order.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="游戏名称">{{ orderDetail.order.gameName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="账号标题">{{ orderDetail.order.accountTitle || '-' }}</el-descriptions-item>
          <el-descriptions-item label="账号描述" :span="2">
            {{ orderDetail.order.accountDescription || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="账号等级">{{ orderDetail.order.accountLevel ? `Lv.${orderDetail.order.accountLevel}` : '-' }}</el-descriptions-item>
          <el-descriptions-item label="租期">{{ formatDuration(orderDetail.order.duration) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDate(orderDetail.order.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDate(orderDetail.order.endTime) }}</el-descriptions-item>
          <el-descriptions-item v-if="orderDetail.order.actualEndTime" label="实际结束时间">
            {{ formatDate(orderDetail.order.actualEndTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="租金">¥{{ formatAmount(orderDetail.order.amount) }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ formatAmount(orderDetail.order.totalAmount) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(orderDetail.order.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(orderDetail.order.updatedAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 租客信息 -->
        <el-descriptions title="租客信息" :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="用户ID">{{ orderDetail.tenant.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ orderDetail.tenant.mobile || '-' }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ orderDetail.tenant.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ getRoleText(orderDetail.tenant.role) }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(orderDetail.tenant.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 号主（卖家）信息 -->
        <el-descriptions title="号主（卖家）信息" :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="用户ID">{{ orderDetail.owner.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ orderDetail.owner.mobile || '-' }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ orderDetail.owner.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ getRoleText(orderDetail.owner.role) }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(orderDetail.owner.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 支付信息（支付宝订单） -->
        <el-descriptions v-if="orderDetail.payment" title="支付信息（支付宝订单）" :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="支付方式">
            {{ orderDetail.payment.paymentType === 'alipay' ? '支付宝' : orderDetail.payment.paymentType }}
          </el-descriptions-item>
          <el-descriptions-item label="支付状态">
            <el-tag :type="getPaymentStatusType(orderDetail.payment.status)">
              {{ getPaymentStatusText(orderDetail.payment.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="交易号">{{ orderDetail.payment.transactionId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付金额">¥{{ formatAmount(orderDetail.payment.amount) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(orderDetail.payment.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatDate(orderDetail.payment.paidAt) || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-descriptions v-else title="支付信息" :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="支付状态">
            <el-tag type="info">未找到支付记录</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 申诉记录 -->
        <el-descriptions title="申诉记录" :column="1" border style="margin-top: 20px">
          <el-descriptions-item v-if="orderDetail.appeals.length === 0" label="申诉状态">
            <el-tag type="success">无申诉记录</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-else>
            <div v-for="(appeal, index) in orderDetail.appeals" :key="appeal.id" class="appeal-item" :style="{ marginBottom: index < orderDetail.appeals.length - 1 ? '20px' : '0' }">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="申诉ID">{{ appeal.id }}</el-descriptions-item>
                <el-descriptions-item label="申诉类型">{{ appeal.typeText }}</el-descriptions-item>
                <el-descriptions-item label="申诉状态">
                  <el-tag :type="appeal.verdict === null ? 'warning' : 'success'">
                    {{ appeal.verdictText }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="处理人">{{ appeal.operatorNickname || '-' }}</el-descriptions-item>
                <el-descriptions-item label="申诉时间">{{ formatDate(appeal.createTime) }}</el-descriptions-item>
                <el-descriptions-item label="处理时间">{{ formatDate(appeal.resolveTime) || '-' }}</el-descriptions-item>
                <el-descriptions-item v-if="appeal.evidenceUrls && appeal.evidenceUrls.length > 0" label="证据" :span="2">
                  <div class="evidence-urls">
                    <el-link
                      v-for="(url, idx) in appeal.evidenceUrls"
                      :key="idx"
                      :href="url"
                      target="_blank"
                      type="primary"
                      style="margin-right: 10px"
                    >
                      证据{{ idx + 1 }}
                    </el-link>
                  </div>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 无数据提示 -->
      <el-empty v-if="!loading && !orderDetail" description="请输入订单号进行查询" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { searchOrderByOrderNo } from '@/api/admin'
import { formatDate } from '@/utils/format'

const searchOrderNo = ref('')
const loading = ref(false)
const orderDetail = ref<any>(null)

// 搜索订单
const handleSearch = async () => {
  if (!searchOrderNo.value.trim()) {
    ElMessage.warning('请输入订单号')
    return
  }

  loading.value = true
  try {
    const res = await searchOrderByOrderNo(searchOrderNo.value.trim())
    if (res.data) {
      orderDetail.value = res.data
      ElMessage.success('查询成功')
    } else {
      orderDetail.value = null
      ElMessage.warning('未找到订单')
    }
  } catch (error: any) {
    console.error('查询订单失败:', error)
    orderDetail.value = null
    ElMessage.error(error?.response?.data?.message || '查询失败')
  } finally {
    loading.value = false
  }
}

// 格式化金额
const formatAmount = (amount: number | string | undefined) => {
  if (!amount) return '0.00'
  return parseFloat(String(amount)).toFixed(2)
}

// 格式化时长
const formatDuration = (minutes: number | undefined | null) => {
  if (!minutes || isNaN(minutes) || minutes <= 0) {
    return '-'
  }
  if (minutes < 60) {
    return `${minutes} 分钟`
  } else if (minutes < 1440) {
    return `${Math.floor(minutes / 60)} 小时`
  } else {
    return `${Math.floor(minutes / 1440)} 天`
  }
}

// 获取状态类型
const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'paying': 'warning',
    'leasing': 'success',
    'closed': 'info',
    'appeal': 'danger',
    'cancelled': 'info'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'paying': '待支付',
    'leasing': '租赁中',
    'closed': '已归还',
    'appeal': '申诉中',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

// 获取支付状态类型
const getPaymentStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning',
    'success': 'success',
    'failed': 'danger',
    'refunded': 'info'
  }
  return statusMap[status] || 'info'
}

// 获取支付状态文本
const getPaymentStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待支付',
    'success': '支付成功',
    'failed': '支付失败',
    'refunded': '已退款'
  }
  return statusMap[status] || status
}

// 获取角色文本
const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    'TENANT': '租客',
    'OWNER': '号主',
    'OPERATOR': '运营'
  }
  return roleMap[role] || role
}
</script>

<style scoped lang="scss">
.order-search {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-detail-container {
  margin-top: 20px;
}

.appeal-item {
  margin-bottom: 20px;
}

.evidence-urls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>


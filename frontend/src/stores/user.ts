import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/types/user'
import { login, getUserInfo } from '@/api/user'
import { getToken, removeToken, setToken } from '@/utils/auth'

export const useUserStore = defineStore('user', () => {
  // token 从 localStorage 初始化
  const _token = ref<string>(getToken() || '')
  const userInfo = ref<UserInfo | null>(null)

  // token 的 computed，确保始终从 localStorage 读取最新值
  const token = computed({
    get: () => {
      // 如果 store 中的 token 为空，尝试从 localStorage 读取
      if (!_token.value) {
        const localToken = getToken()
        if (localToken) {
          _token.value = localToken
        }
      }
      return _token.value
    },
    set: (value: string) => {
      _token.value = value
      if (value) {
        setToken(value)
      } else {
        removeToken()
      }
    }
  })

  // 登录
  const userLogin = async (mobile: string, password: string) => {
    try {
      const res = await login({ mobile, password })
      // 后端返回格式：{ code: 200, message: "登录成功", data: { token: "...", ... } }
      if (res.data && res.data.token) {
        token.value = res.data.token // 使用 computed setter，会自动保存到 localStorage
        if (res.data.user) {
          userInfo.value = res.data.user
        } else if (res.data.userInfo) {
          userInfo.value = res.data.userInfo
        } else {
          await fetchUserInfo()
        }
      }
      return res
    } catch (error) {
      throw error
    }
  }

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const res = await getUserInfo()
      // 后端返回格式：{ code: 200, message: "操作成功", data: { id, mobile, nickname, role, created_at } }
      if (res && res.data) {
        // 确保 role 字段存在且正确
        const userData = {
          id: res.data.id,
          mobile: res.data.mobile,
          nickname: res.data.nickname,
          role: res.data.role || res.data.userRole, // 兼容不同的字段名
          createdAt: res.data.created_at || res.data.createdAt
        }
        userInfo.value = userData as UserInfo
        console.log('获取用户信息成功:', userInfo.value)
      } else {
        console.warn('获取用户信息返回数据格式异常:', res)
        throw new Error('获取用户信息失败：返回数据格式异常')
      }
      return userInfo.value
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果获取失败，清除 token（可能是 token 已过期）
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as any
        if (httpError.response?.status === 401 || httpError.response?.status === 403) {
          console.log('Token 已过期或无效，清除 token')
          token.value = ''
        }
      }
      throw error
    }
  }

  // 退出登录
  const logout = () => {
    token.value = '' // 使用 computed setter，会自动清除 localStorage
    userInfo.value = null
  }

  // 初始化用户信息（从本地存储恢复）
  const initUserInfo = async () => {
    const localToken = getToken()
    if (localToken) {
      _token.value = localToken
      try {
        await fetchUserInfo()
      } catch (error) {
        // 如果获取用户信息失败，可能是 token 已过期，清除 token
        console.error('初始化用户信息失败，清除 token:', error)
        token.value = ''
      }
    }
  }

  return {
    token,
    userInfo,
    userLogin,
    fetchUserInfo,
    logout,
    initUserInfo,
  }
})


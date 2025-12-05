import type { Router } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore()

    // 设置页面标题
    if (to.meta.title) {
      document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE}`
    }

    // 如果 token 为空但 localStorage 中有 token，初始化用户信息
    if (!userStore.token) {
      await userStore.initUserInfo()
    }

    // 检查是否需要认证
    if (to.meta.requiresAuth) {
      if (!userStore.token) {
        ElMessage.warning('请先登录')
        next({
          path: '/login',
          query: { redirect: to.fullPath },
        })
        return
      }

      // 检查角色权限（支持大小写不敏感）
      if (to.meta.role) {
        const routeRole = String(to.meta.role).toLowerCase()
        const userRole = userStore.userInfo?.role ? String(userStore.userInfo.role).toLowerCase() : undefined
        
        // 调试日志
        console.log('路由守卫 - 角色检查:', {
          path: to.path,
          routeRole,
          userRole,
          userInfo: userStore.userInfo
        })
        
        if (!userRole) {
          console.warn('用户角色信息缺失，尝试重新获取用户信息')
          // 如果用户信息缺失，尝试重新获取
          try {
            await userStore.fetchUserInfo()
            const updatedRole = userStore.userInfo?.role ? String(userStore.userInfo.role).toLowerCase() : undefined
            if (!updatedRole) {
              console.error('重新获取用户信息后，角色仍然为空')
              ElMessage.error('获取用户信息失败，请重新登录')
              userStore.logout()
              next({
                path: '/login',
                query: { redirect: to.fullPath },
              })
              return
            }
            if (updatedRole !== routeRole) {
              // OPERATOR 可以访问 owner 路由（管理员可以管理商家功能）
              if (updatedRole === 'operator' && routeRole === 'owner') {
                // 允许通过
                console.log('管理员访问商家路由，允许通过')
              } else {
                ElMessage.error('无权限访问')
                next('/home')
                return
              }
            }
          } catch (error) {
            console.error('获取用户信息失败:', error)
            ElMessage.error('获取用户信息失败，请重新登录')
            userStore.logout()
            next({
              path: '/login',
              query: { redirect: to.fullPath },
            })
            return
          }
        } else if (userRole !== routeRole) {
          // OPERATOR 可以访问 owner 路由（管理员可以管理商家功能）
          if (userRole === 'operator' && routeRole === 'owner') {
            // 允许通过
            console.log('管理员访问商家路由，允许通过')
          } else {
            console.warn('角色不匹配:', { userRole, routeRole })
            ElMessage.error('无权限访问')
            next('/home')
            return
          }
        }
      }
    }

    // 已登录用户访问登录/注册页，重定向到首页
    if ((to.path === '/login' || to.path === '/register') && userStore.token) {
      next('/home')
      return
    }

    next()
  })

  router.afterEach(() => {
    // 路由切换后的处理
  })
}


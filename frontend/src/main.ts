import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 应用启动时初始化用户信息（从 localStorage 恢复登录状态）
import { useUserStore } from './stores/user'
const userStore = useUserStore()

// 异步初始化用户信息，但不阻塞应用启动
userStore.initUserInfo().catch(error => {
  console.error('初始化用户信息失败:', error)
  // 初始化失败不影响应用启动，只是用户需要重新登录
})

app.mount('#app')


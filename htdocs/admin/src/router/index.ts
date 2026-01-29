import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/liveapi'
  },
  {
    path: '/liveapi',
    name: 'LiveAPI',
    component: () => import('@/views/LiveAPIConfig.vue'),
    meta: { title: 'LiveAPI 设置' }
  },
  {
    path: '/tournament',
    name: 'Tournament',
    component: () => import('@/views/Tournament.vue'),
    meta: { title: '锦标赛' }
  },
  {
    path: '/observer',
    name: 'Observer',
    component: () => import('@/views/Observer.vue'),
    meta: { title: '观察者' }
  },
  {
    path: '/players',
    name: 'Players',
    component: () => import('@/views/Players.vue'),
    meta: { title: '玩家' }
  },
  {
    path: '/teams',
    name: 'Teams',
    component: () => import('@/views/Teams.vue'),
    meta: { title: '队伍' }
  },
  {
    path: '/ingame',
    name: 'InGame',
    component: () => import('@/views/InGameSettings.vue'),
    meta: { title: '游戏内设置' }
  },
  {
    path: '/overlay',
    name: 'Overlay',
    component: () => import('@/views/Overlay.vue'),
    meta: { title: '叠加层' }
  },
  {
    path: '/announce',
    name: 'Announce',
    component: () => import('@/views/Announce.vue'),
    meta: { title: '公告' }
  },
  {
    path: '/results',
    name: 'Results',
    component: () => import('@/views/Results.vue'),
    meta: { title: '结果' }
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('@/views/Test.vue'),
    meta: { title: '测试' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

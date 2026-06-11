import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useServerStore } from '../stores/server'
import LoginView from '../views/LoginView.vue'
import DashBoard from '../views/DashBoard.vue'
import ServerTemplate from '../layouts/ServerTemplate.vue'
import HubView from '../views/HubView.vue'
import TextView from '../views/TextView.vue'
import RoomView from '../views/RoomView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashBoard,
      meta: { requiresAuth: true }
    },
    {
      path: '/server',
      component: ServerTemplate,
      meta: { requiresAuth: true },
      redirect: '/server/hub',
      children: [
        { path: 'hub', name: 'hub', component: HubView },
        { path: 'text', name: 'text', component: TextView },
        { path: 'voice', name: 'voice', component: RoomView }
      ]
    }
  ]
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.accessToken) {
    return '/login'
  }
  if (to.path.startsWith('/server') && !useServerStore().activeServerId) {
    return '/dashboard'
  }
})

import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  { path: '/signup', component: () => import('../views/Signup.vue') },
  { path: '/app', component: () => import('@/App.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});
export default router;

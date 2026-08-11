import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/discover',
    name: 'Discover',
    component: () => import('../views/DiscoverView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/heatmap',
    name: 'Heatmap',
    component: () => import('../views/HeatmapView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/catchment',
    name: 'Catchment',
    component: () => import('../views/CatchmentView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/my-locations',
    name: 'MyLocations',
    component: () => import('../views/MyLocationsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/discover',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Try to restore user session if not initialized yet
  if (!authStore.initialized) {
    await authStore.fetchCurrentUser();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'Discover' });
  } else {
    next();
  }
});

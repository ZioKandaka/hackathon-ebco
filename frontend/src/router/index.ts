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
    component: { template: '<div style="padding: 2rem;"><h1>Discover Features</h1><p>Location Intelligence Map & Analytics</p></div>' },
    meta: { requiresAuth: true },
  },
  {
    path: '/heatmap',
    name: 'Heatmap',
    component: { template: '<div style="padding: 2rem;"><h1>Heatmap Features</h1><p>Density & Catchment Map</p></div>' },
    meta: { requiresAuth: true },
  },
  {
    path: '/my-locations',
    name: 'MyLocations',
    component: { template: '<div style="padding: 2rem;"><h1>My Locations</h1><p>Saved Business Locations</p></div>' },
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

  // Try to restore user session if not loaded yet
  if (!authStore.isAuthenticated) {
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

<template>
  <nav class="navbar">
    <div class="nav-brand">
      <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        />
      </svg>
      <span>Pinpoint</span>
    </div>
    <div class="nav-links">
      <template v-if="authStore.isAuthenticated">
        <router-link to="/discover" class="nav-link">Discover</router-link>
        <router-link to="/heatmap" class="nav-link">Heatmap</router-link>
        <router-link to="/catchment" class="nav-link">Catchment</router-link>
        <router-link to="/site-visit" class="nav-link">Site Visit</router-link>
        <router-link to="/my-locations" class="nav-link">My Locations</router-link>
        <span class="user-email">{{ authStore.user?.email }}</span>
        <button @click="handleLogout" class="btn-logout" :disabled="authStore.loading">
          Log out
        </button>
      </template>
      <template v-else>
        <router-link to="/login" class="nav-link">Login</router-link>
        <router-link to="/register" class="btn-register">Register</router-link>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  z-index: 1100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  background-color: #1a202c;
  color: white;
  font-family: system-ui, -apple-system, sans-serif;
  box-sizing: border-box;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.brand-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  fill: #3182ce;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-link {
  color: #e2e8f0;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.nav-link:hover, .nav-link.router-link-active {
  color: #3182ce;
}

.user-email {
  font-size: 0.875rem;
  color: #a0aec0;
  padding: 0 0.5rem;
}

.btn-logout {
  background: transparent;
  border: 1px solid #4a5568;
  color: #e2e8f0;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-logout:hover {
  background-color: #2d3748;
}

.btn-register {
  background-color: #3182ce;
  color: white;
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
}

.btn-register:hover {
  background-color: #2b6cb0;
}
</style>

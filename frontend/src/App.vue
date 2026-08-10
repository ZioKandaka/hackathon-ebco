<template>
  <div id="app">
    <NavBar />
    <main class="main-content">
      <router-view />
    </main>
    <AiChatPanel v-if="authStore.isAuthenticated" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import NavBar from './components/navigation/NavBar.vue';
import AiChatPanel from './components/chat/AiChatPanel.vue';
import { useAuthStore } from './stores/auth.store';

const authStore = useAuthStore();

onMounted(async () => {
  await authStore.fetchCurrentUser();
});
</script>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #f7fafc;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  margin-top: 60px;
  flex: 1;
}
</style>

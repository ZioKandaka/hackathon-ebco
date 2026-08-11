<template>
  <div class="page-container">
    <LoginForm />
  </div>
</template>

<script setup lang="ts">
import LoginForm from '../components/auth/LoginForm.vue';
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f7fafc;
  pointer-events: auto;
}
</style>

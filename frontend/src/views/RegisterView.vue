<template>
  <div class="page-container">
    <RegisterForm />
  </div>
</template>

<script setup lang="ts">
import RegisterForm from '../components/auth/RegisterForm.vue';
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f7fafc;
}
</style>

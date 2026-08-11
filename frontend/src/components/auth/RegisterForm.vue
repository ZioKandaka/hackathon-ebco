<template>
  <div class="auth-form-container">
    <h2>Create Account</h2>
    <p class="subtitle">Join Pinpoint</p>

    <div v-if="localError || authStore.error" class="error-banner">
      {{ localError || authStore.error }}
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="name@example.com"
          required
          :disabled="authStore.loading"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="At least 8 characters (letters & numbers)"
          required
          :disabled="authStore.loading"
        />
      </div>

      <div class="form-group">
        <label for="passwordConfirm">Confirm Password</label>
        <input
          id="passwordConfirm"
          v-model="passwordConfirm"
          type="password"
          placeholder="Re-enter your password"
          required
          :disabled="authStore.loading"
        />
      </div>

      <button type="submit" class="btn-submit" :disabled="authStore.loading">
        <span v-if="authStore.loading" class="spinner"></span>
        <span v-else>Register</span>
      </button>
    </form>

    <div class="footer-link">
      Already have an account? <router-link to="/login">Sign in</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const localError = ref<string | null>(null);

async function handleSubmit() {
  localError.value = null;

  if (password.value.length < 8) {
    localError.value = 'Password must be at least 8 characters long.';
    return;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password.value)) {
    localError.value = 'Password must contain at least one letter and one number.';
    return;
  }

  if (password.value !== passwordConfirm.value) {
    localError.value = 'Passwords do not match.';
    return;
  }

  try {
    await authStore.register(email.value, password.value, passwordConfirm.value);
    router.push('/discover');
  } catch (err) {
    // Handled by store error state
  }
}
</script>

<style scoped>
.auth-form-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2.5rem;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: system-ui, -apple-system, sans-serif;
}

h2 {
  margin: 0 0 0.25rem 0;
  color: #1a202c;
  font-size: 1.5rem;
  font-weight: 700;
}

.subtitle {
  margin: 0 0 1.5rem 0;
  color: #718096;
  font-size: 0.875rem;
}

.error-banner {
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  background-color: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 6px;
  color: #c53030;
  font-size: 0.875rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
}

.btn-submit {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #3182ce;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background-color: #2b6cb0;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footer-link {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: #718096;
}

.footer-link a {
  color: #3182ce;
  text-decoration: none;
  font-weight: 600;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

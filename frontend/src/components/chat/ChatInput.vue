<template>
  <div class="chat-input-container">
    <form @submit.prevent="handleSend" class="chat-input-form">
      <textarea
        v-model="inputMessage"
        placeholder="Ask AI assistant... (Enter to send, Shift+Enter for a new line)"
        class="chat-input-field"
        rows="4"
        :disabled="disabled"
        @keydown="handleKeydown"
      ></textarea>
      <div class="input-actions">
        <button
          type="submit"
          class="btn-send"
          :disabled="disabled || !inputMessage.trim()"
        >
          Send
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', message: string): void;
}>();

const inputMessage = ref('');

function handleSend() {
  const text = inputMessage.value.trim();
  if (text && !props.disabled) {
    emit('send', text);
    inputMessage.value = '';
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}
</script>

<style scoped>
.chat-input-container {
  padding: 1rem;
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.chat-input-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chat-input-field {
  width: 100%;
  padding: 0.75rem 0.875rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  min-height: 5.5rem;
  max-height: 16rem;
  box-sizing: border-box;
}

.chat-input-field:focus {
  border-color: #3182ce;
  box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
}

.input-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-send {
  padding: 0.625rem 1.25rem;
  background-color: #3182ce;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-send:hover:not(:disabled) {
  background-color: #2b6cb0;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

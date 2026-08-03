<template>
  <aside class="ai-chat-panel" :class="{ minimized: isMinimized }">
    <header class="panel-header">
      <div class="panel-title">
        <span class="ai-badge">AI</span>
        <span>Assistant</span>
      </div>
      <button @click="toggleMinimize" class="btn-toggle" :title="isMinimized ? 'Expand' : 'Minimize'">
        {{ isMinimized ? '▲ Expand' : '▼ Minimize' }}
      </button>
    </header>

    <div v-show="!isMinimized" class="panel-body">
      <ChatMessageList
        :messages="chatStore.messages"
        :active-status-step="chatStore.activeStatusStep"
        :error-message="chatStore.errorMessage"
      />
      <ChatInput
        :disabled="chatStore.isStreaming"
        @send="handleSend"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useChatStore } from '../../stores/chat.store';
import ChatMessageList from './ChatMessageList.vue';
import ChatInput from './ChatInput.vue';

const chatStore = useChatStore();
const isMinimized = ref(false);

function toggleMinimize() {
  isMinimized.value = !isMinimized.value;
}

function handleSend(messageText: string) {
  chatStore.sendMessage(messageText);
}

onMounted(() => {
  if (!chatStore.historyLoaded) {
    chatStore.fetchHistory();
  }
});
</script>

<style scoped>
.ai-chat-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 25vw;
  min-width: 320px;
  height: 100vh;
  z-index: 1000;
  background-color: #ffffff;
  border-left: 1px solid #e2e8f0;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, sans-serif;
  transition: transform 0.3s ease;
  pointer-events: auto;
}

.ai-chat-panel.minimized {
  height: 48px;
  overflow: hidden;
}

.panel-header {
  height: 48px;
  padding: 0 1rem;
  background-color: #1a202c;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}

.ai-badge {
  background-color: #3182ce;
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.btn-toggle {
  background: transparent;
  border: none;
  color: #a0aec0;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-toggle:hover {
  color: white;
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 768px) {
  .ai-chat-panel {
    width: 100vw;
    min-width: 100vw;
  }
}
</style>

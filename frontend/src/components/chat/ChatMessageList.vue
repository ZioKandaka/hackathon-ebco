<template>
  <div ref="scrollContainer" class="message-list-container">
    <div
      v-for="msg in messages"
      :key="msg.id || msg.createdAt"
      class="message-wrapper"
      :class="msg.sender"
    >
      <div class="message-card">
        <div class="message-header">
          <span class="sender-label">{{ msg.sender === 'user' ? 'You' : 'AI Assistant' }}</span>
        </div>
        <div class="message-content">{{ msg.content }}</div>
        <SiteVisitGallery v-if="msg.siteVisitData" :site-visit-data="msg.siteVisitData" />
      </div>
    </div>

    <!-- Active live status card -->
    <ChatStatusCard v-if="activeStatusStep" :step-text="activeStatusStep" />

    <!-- Error message card if stream failed -->
    <div v-if="errorMessage" class="error-card">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import ChatStatusCard from './ChatStatusCard.vue';
import SiteVisitGallery from './SiteVisitGallery.vue';

export interface DisplayMessage {
  id?: string;
  sender: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  siteVisitData?: any;
}

const props = defineProps<{
  messages: DisplayMessage[];
  activeStatusStep?: string | null;
  errorMessage?: string | null;
}>();

const scrollContainer = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

watch(
  () => [props.messages.length, props.activeStatusStep, props.errorMessage],
  () => {
    scrollToBottom();
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.message-list-container {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  background-color: #f7fafc;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
}

.message-wrapper.user {
  align-items: flex-end;
}

.message-wrapper.assistant {
  align-items: flex-start;
}

.message-card {
  max-width: 85%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.4;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.message-wrapper.user .message-card {
  background-color: #3182ce;
  color: white;
  border-bottom-right-radius: 2px;
}

.message-wrapper.assistant .message-card {
  background-color: #ffffff;
  color: #2d3748;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 2px;
}

.sender-label {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: block;
  opacity: 0.85;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.error-card {
  padding: 0.75rem 1rem;
  background-color: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 6px;
  color: #c53030;
  font-size: 0.8125rem;
}
</style>

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { ChatSseService, ChatStreamEvent } from '../services/chat-sse.service';
import { useDiscoveryStore } from './discovery.store';
import { useCatchmentStore } from './catchment.store';
import { useSiteVisitStore } from './siteVisit.store';
import { useHeatmapStore } from './heatmap.store';
import { googleMapService } from '../services/google-map.service';
import { router } from '../router';

export interface ChatMessageItem {
  id?: string;
  sender: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessageItem[]>([]);
  const activeStatusStep = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);
  const isStreaming = ref(false);
  const historyLoaded = ref(false);

  async function fetchHistory() {
    try {
      const response = await apiClient.get<{ messages: ChatMessageItem[] }>('/chat/history');
      messages.value = response.data.messages || [];
      historyLoaded.value = true;
    } catch (err) {
      // Ignore unauthorized or network errors on history fetch
      messages.value = [];
    }
  }

  async function sendMessage(userText: string) {
    if (!userText.trim() || isStreaming.value) return;

    errorMessage.value = null;
    activeStatusStep.value = 'Initiating request...';
    isStreaming.value = true;

    // Immediately append user message locally
    messages.value.push({
      sender: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    });

    await ChatSseService.streamChatMessage(
      userText,
      (event: ChatStreamEvent) => {
        if (event.type === 'status' && event.step) {
          activeStatusStep.value = event.step;
        } else if (event.type === 'message' && event.content) {
          activeStatusStep.value = null;
          const newMsg: ChatMessageItem = {
            sender: 'assistant',
            content: event.content,
            createdAt: event.timestamp || new Date().toISOString(),
          };

          if (event.siteVisitData) {
            // No images/gallery render inline in chat — the full report (images + scores) lives
            // in the Site Visit panel, which addRun() selects and centers the map on.
            const siteVisitStore = useSiteVisitStore();
            siteVisitStore.addRun(event.siteVisitData);
            router.push('/site-visit');
          }

          messages.value.push(newMsg);

          if (event.discoveryData && event.discoveryData.candidates) {
            const discoveryStore = useDiscoveryStore();
            discoveryStore.addRun(event.discoveryData);
            router.push('/discover');
          }

          if (event.heatmapData && event.heatmapData.points) {
            const heatmapStore = useHeatmapStore();
            heatmapStore.addRun(event.heatmapData);
            router.push('/heatmap');
          }

          if (event.catchmentData && event.catchmentData.center) {
            const catchmentStore = useCatchmentStore();
            catchmentStore.addRun(event.catchmentData);
            router.push('/catchment');
          }

          if (event.travelBoundaryData && event.travelBoundaryData.polygonCoordinates) {
            // Boundary-only: shape on the map only, deliberately not touching the catchment
            // store/panel/history — this is not a scored run.
            googleMapService.renderIsochronePolygon(
              event.travelBoundaryData.polygonCoordinates,
              { fitBounds: true },
            );
          }
        } else if (event.type === 'error' && event.error) {
          activeStatusStep.value = null;
          errorMessage.value = event.error;
        } else if (event.type === 'done') {
          activeStatusStep.value = null;
          isStreaming.value = false;
        }
      },
      (err: Error) => {
        activeStatusStep.value = null;
        isStreaming.value = false;
        errorMessage.value = err.message || 'Stream processing failed.';
      }
    );
  }

  return {
    messages,
    activeStatusStep,
    errorMessage,
    isStreaming,
    historyLoaded,
    fetchHistory,
    sendMessage,
  };
});

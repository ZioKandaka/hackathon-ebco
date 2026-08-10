export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface HeatmapDataPayload {
  queryId: string;
  mode: 'business_based' | 'custom_prompt';
  businessType?: string;
  region: string;
  pointCount: number;
  points: HeatmapPoint[];
  summary: string;
}

export interface CatchmentSubScores {
  demandDensity: number;
  trafficProxy: number;
  areaQuality: number;
  competitionPenalty: number;
  networkSaturation: number;
  operationalVitality: number;
}

export interface CatchmentDataPayload {
  analysisId: string;
  locationId: string;
  locationName: string;
  radiusKm: number;
  compositeScore: number;
  subScores: CatchmentSubScores;
  poiCount: number;
  center: { lat: number; lng: number };
  summary: string;
}

export interface ChatStreamEvent {
  type: 'status' | 'message' | 'error' | 'done';
  step?: string;
  content?: string;
  candidates?: any[];
  heatmapData?: HeatmapDataPayload;
  catchmentData?: CatchmentDataPayload;
  error?: string;
  timestamp: string;
}

export class ChatSseService {
  private static getApiBaseUrl(): string {
    return (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || '/api/v1';
  }

  static async streamChatMessage(
    message: string,
    onEvent: (event: ChatStreamEvent) => void,
    onError: (err: Error) => void,
  ): Promise<void> {
    const url = `${this.getApiBaseUrl()}/chat/stream`;

    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const dataLine = line.split('\n').find((l) => l.startsWith('data: '));
          if (dataLine) {
            const rawJson = dataLine.slice(6).trim();
            if (rawJson) {
              try {
                const event: ChatStreamEvent = JSON.parse(rawJson);
                onEvent(event);
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }
    } catch (err: any) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

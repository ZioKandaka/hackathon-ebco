export interface DiscoveryCandidate {
  rank: number;
  name: string;
  latitude: number;
  longitude: number;
  demandScore: number;
  competitionCount: number;
  rationale: string;
  regencyCode?: string;
  businessType: string;
}

export interface DiscoveryDataPayload {
  searchId: string;
  businessType: string;
  region: string;
  candidates: DiscoveryCandidate[];
  summary: string;
  createdAt: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  id?: string;
  name?: string;
  category?: string;
  rating?: number;
  userRatingsTotal?: number;
  businessStatus?: string;
}

export interface HeatmapDataPayload {
  queryId: string;
  locationId?: string;
  category: string;
  locationName: string;
  radiusKm: number;
  center: { lat: number; lng: number };
  pointCount: number;
  points: HeatmapPoint[];
  summary: string;
  createdAt: string;
}

export interface CatchmentSubScores {
  demandDensity: number;
  trafficProxy: number;
  areaQuality: number;
  competitionPenalty: number;
  networkSaturation: number;
  operationalVitality: number;
}

export type CatchmentSubScoreKey = keyof CatchmentSubScores;

export interface ContributingPoi {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  rating?: number;
  businessStatus?: string;
}

export interface CatchmentDataPayload {
  analysisId: string;
  locationId: string;
  locationName: string;
  category: string;
  boundaryType: 'radius' | 'time';
  radiusKm?: number;
  travelMode?: 'drive' | 'walk' | 'transit';
  timeMinutes?: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
  compositeScore: number;
  subScores: CatchmentSubScores;
  weights: CatchmentSubScores;
  poiCount: number;
  contributingPois: Record<CatchmentSubScoreKey, ContributingPoi[]>;
  explanations: Record<CatchmentSubScoreKey, string> | null;
  center: { lat: number; lng: number };
  summary: string;
  createdAt: string;
}

export interface TravelBoundaryDataPayload {
  locationName: string;
  travelMode: 'drive' | 'walk' | 'transit';
  timeMinutes: number;
  polygonCoordinates: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number };
  summary: string;
}

export type SiteVisitImageType = 'north' | 'east' | 'south' | 'west' | 'satellite';

export interface VisualCriterionScore {
  score: number;
  justification: string;
}

export interface SiteVisitCriteria {
  storefrontVisibility: VisualCriterionScore;
  roadWidthAccess: VisualCriterionScore;
  trafficVisibility: VisualCriterionScore;
  buildingTypes: VisualCriterionScore;
  areaCondition: VisualCriterionScore;
}

export interface SiteVisitDataPayload {
  reportId: string;
  locationId?: string;
  locationName: string;
  hasStreetViewCoverage: boolean;
  overallVisualScore: number;
  criteria: SiteVisitCriteria;
  availableImageTypes: SiteVisitImageType[];
  center: { lat: number; lng: number };
  summary: string;
  createdAt: string;
}

export interface ChatStreamEvent {
  type: 'status' | 'message' | 'error' | 'done';
  step?: string;
  content?: string;
  discoveryData?: DiscoveryDataPayload;
  heatmapData?: HeatmapDataPayload;
  catchmentData?: CatchmentDataPayload;
  travelBoundaryData?: TravelBoundaryDataPayload;
  siteVisitData?: SiteVisitDataPayload;
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

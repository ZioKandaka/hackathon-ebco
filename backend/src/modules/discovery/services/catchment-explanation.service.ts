import { Injectable, Logger } from '@nestjs/common';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

export const CATCHMENT_SUB_SCORE_KEYS = [
  'demandDensity',
  'trafficProxy',
  'areaQuality',
  'competitionPenalty',
  'networkSaturation',
  'operationalVitality',
] as const;

export type CatchmentSubScoreKey = (typeof CATCHMENT_SUB_SCORE_KEYS)[number];

export interface ContributingPoiFact {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  rating?: number;
  businessStatus?: string;
}

export interface CatchmentExplanationInput {
  category: string;
  locationName: string;
  radiusKm: number;
  subScores: Record<CatchmentSubScoreKey, number>;
  weights: Record<CatchmentSubScoreKey, number>;
  contributingPois: Record<CatchmentSubScoreKey, ContributingPoiFact[]>;
}

const SUB_SCORE_LABELS: Record<CatchmentSubScoreKey, string> = {
  demandDensity: 'Demand Density',
  trafficProxy: 'Traffic Proxy',
  areaQuality: 'Area Quality',
  competitionPenalty: 'Competition Penalty',
  networkSaturation: 'Network Saturation',
  operationalVitality: 'Operational Vitality',
};

@Injectable()
export class CatchmentExplanationService {
  private readonly logger = new Logger(CatchmentExplanationService.name);
  private model: GenerativeModel | null = null;

  constructor() {
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'ebco-aidev-ziok';
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    try {
      const vertexAi = new VertexAI({ project, location });
      this.model = vertexAi.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } catch (err: any) {
      this.logger.warn(`Vertex AI initialization note: ${err.message}`);
    }
  }

  /**
   * Generates one short, grounded explanation per sub-score in a single call. Vertex AI is only
   * ever asked to phrase the already-computed facts below — never to independently judge or
   * invent a distance, count, POI name, or score, since those are deterministic backend output.
   * Returns null (never throws) on any failure — the numeric scores remain valid and displayable
   * on their own; the panel should show "explanation unavailable" rather than lose the whole run.
   */
  async generateExplanations(
    input: CatchmentExplanationInput,
  ): Promise<Record<CatchmentSubScoreKey, string> | null> {
    if (!this.model) {
      this.logger.warn('Vertex AI model unavailable — skipping catchment explanations.');
      return null;
    }

    const factSheet = CATCHMENT_SUB_SCORE_KEYS.map((key) => {
      const pois = input.contributingPois[key] || [];
      const poiLines =
        pois.length > 0
          ? pois
              .map(
                (p) =>
                  `    - "${p.name}" (${p.category}), ${p.distanceMeters}m away${p.rating ? `, rated ${p.rating}` : ''}`,
              )
              .join('\n')
          : '    - (no specific POIs contributed to this sub-score)';

      return `${SUB_SCORE_LABELS[key]}: score ${input.subScores[key]}/100, weight ${Math.round(input.weights[key] * 100)}%
  Real contributing POIs:
${poiLines}`;
    }).join('\n\n');

    const prompt = `You are explaining a location catchment analysis for a "${input.category}" business at "${input.locationName}", analyzed within a ${input.radiusKm}km radius.

Here are the 6 sub-scores and the REAL, deterministically-computed POI facts behind each one:

${factSheet}

Write one short explanation (1-2 sentences) per sub-score, in plain language a business owner would understand, explaining WHY that sub-score has the value it has.

STRICT RULES:
- Only reference POI names, distances, counts, and ratings that are explicitly given above. Never invent, assume, or estimate a POI, distance, or number not present in this data.
- If a sub-score has no contributing POIs listed, say so plainly (e.g. "no nearby data was found for this") rather than inventing a reason.
- Respond with ONLY a JSON object mapping each of these exact keys to its explanation string: ${CATCHMENT_SUB_SCORE_KEYS.join(', ')}
- No markdown fences, no extra commentary outside the JSON object.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text =
        result.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const explanations: Partial<Record<CatchmentSubScoreKey, string>> = {};
      for (const key of CATCHMENT_SUB_SCORE_KEYS) {
        if (typeof parsed[key] === 'string' && parsed[key].trim()) {
          explanations[key] = parsed[key].trim();
        }
      }

      // Require all 6 to trust the response is well-formed; otherwise treat as unavailable
      // rather than showing a partially-explained panel that looks like a bug.
      const hasAllKeys = CATCHMENT_SUB_SCORE_KEYS.every((key) => explanations[key]);
      return hasAllKeys ? (explanations as Record<CatchmentSubScoreKey, string>) : null;
    } catch (err: any) {
      this.logger.error(`Catchment explanation generation error: ${err.message}`);
      return null;
    }
  }
}

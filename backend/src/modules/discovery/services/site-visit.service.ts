import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { VertexAI, GenerativeModel, Part } from '@google-cloud/vertexai';

export const SITE_VISIT_IMAGE_TYPES = ['north', 'east', 'south', 'west', 'satellite'] as const;
export type SiteVisitImageType = (typeof SITE_VISIT_IMAGE_TYPES)[number];

export interface VisualCriterionScore {
  score: number;
  justification: string;
}

export interface VisualCriteriaMap {
  storefrontVisibility: VisualCriterionScore;
  roadWidthAccess: VisualCriterionScore;
  trafficVisibility: VisualCriterionScore;
  buildingTypes: VisualCriterionScore;
  areaCondition: VisualCriterionScore;
}

export interface SiteVisitResult {
  hasStreetViewCoverage: boolean;
  overallVisualScore: number;
  criteria: VisualCriteriaMap;
  availableImageTypes: SiteVisitImageType[];
  summary: string;
}

const HEADING_BY_TYPE: Record<Exclude<SiteVisitImageType, 'satellite'>, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

const CRITERION_WEIGHTS: Record<keyof VisualCriteriaMap, number> = {
  storefrontVisibility: 0.3,
  roadWidthAccess: 0.25,
  trafficVisibility: 0.2,
  buildingTypes: 0.15,
  areaCondition: 0.1,
};

const CRITERION_KEYS = Object.keys(CRITERION_WEIGHTS) as (keyof VisualCriteriaMap)[];

@Injectable()
export class SiteVisitService {
  private readonly logger = new Logger(SiteVisitService.name);
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

  private getApiKey(): string {
    return process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Server-side-only URL (embeds the Maps API key) used internally to fetch image bytes for
   * both vision scoring and the authenticated image-proxy endpoint. Never returned to a client.
   */
  buildImageUrl(lat: number, lng: number, type: SiteVisitImageType): string {
    const apiKey = this.getApiKey();
    // 640x480 is the largest `size` the Static Maps/Street View Static APIs allow on a
    // standard (non-premium) key; `scale=2` then doubles the actual returned pixel dimensions
    // (to 1280x960) without exceeding that cap — sharper thumbnails/lightbox, and more detail
    // for the vision model to score from.
    if (type === 'satellite') {
      return `https://maps.googleapis.com/maps/api/staticmap?size=640x480&scale=2&center=${lat},${lng}&zoom=18&maptype=satellite&key=${apiKey}`;
    }
    const heading = HEADING_BY_TYPE[type];
    return `https://maps.googleapis.com/maps/api/streetview?size=640x480&scale=2&location=${lat},${lng}&heading=${heading}&pitch=0&key=${apiKey}`;
  }

  /**
   * Fetches the raw bytes for one image tile (used by the vision-scoring call and by the
   * image-proxy controller so the Maps API key never has to leave the backend).
   */
  async fetchImageBuffer(
    lat: number,
    lng: number,
    type: SiteVisitImageType,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const url = this.buildImageUrl(lat, lng, type);
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const contentType = (response.headers['content-type'] as string) || 'image/jpeg';
      return { buffer: Buffer.from(response.data), contentType };
    } catch (err: any) {
      this.logger.warn(`Failed to fetch ${type} image at (${lat}, ${lng}): ${err.message}`);
      return null;
    }
  }

  async analyzeSite(
    lat: number,
    lng: number,
    locationName = 'Site Location',
  ): Promise<SiteVisitResult> {
    const hasStreetViewCoverage = await this.checkStreetViewCoverage(lat, lng);
    const availableImageTypes: SiteVisitImageType[] = hasStreetViewCoverage
      ? ['north', 'east', 'south', 'west', 'satellite']
      : ['satellite'];

    const { criteria, overallVisualScore } = await this.evaluateVisualCriteria(
      lat,
      lng,
      locationName,
      availableImageTypes,
    );

    const coverageNotice = hasStreetViewCoverage
      ? ''
      : '*(Note: No Street View coverage found at this location; performing satellite-imagery-only visual assessment)*\n\n';

    const summary =
      `AI Site Visit Report for ${locationName}:\n\n` +
      coverageNotice +
      `• Overall Visual Rating: ${overallVisualScore} / 100\n\n` +
      `Visual Criteria Assessment:\n` +
      `- Storefront Visibility: ${criteria.storefrontVisibility.score}/100 (${criteria.storefrontVisibility.justification})\n` +
      `- Road Width & Access: ${criteria.roadWidthAccess.score}/100 (${criteria.roadWidthAccess.justification})\n` +
      `- Foot/Vehicle Traffic: ${criteria.trafficVisibility.score}/100 (${criteria.trafficVisibility.justification})\n` +
      `- Surrounding Building Types: ${criteria.buildingTypes.score}/100 (${criteria.buildingTypes.justification})\n` +
      `- General Area Condition: ${criteria.areaCondition.score}/100 (${criteria.areaCondition.justification})`;

    return { hasStreetViewCoverage, overallVisualScore, criteria, availableImageTypes, summary };
  }

  /**
   * Real coverage check via Google's Street View Metadata endpoint — no network call is free of
   * a real "does imagery exist here" answer, so unlike a heuristic this genuinely reflects
   * whether Street View has anything to show at these coordinates.
   */
  private async checkStreetViewCoverage(lat: number, lng: number): Promise<boolean> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured — cannot check Street View coverage.');
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/streetview/metadata', {
        params: { location: `${lat},${lng}`, key: apiKey },
      });
      return response.data?.status === 'OK';
    } catch (err: any) {
      this.logger.error(`Street View metadata check failed: ${err.message}`);
      throw new Error('Could not verify Street View coverage for this location — please try again.');
    }
  }

  /**
   * Scores the site purely from the real fetched imagery via a Gemini vision call — never a
   * hardcoded/fabricated score. There is no deterministic fallback for "what does this street
   * look like", so on any failure (no model, no images, malformed response) this throws a real
   * error rather than inventing scores, mirroring poi-relevance-classifier.service.ts.
   */
  private async evaluateVisualCriteria(
    lat: number,
    lng: number,
    locationName: string,
    imageTypes: SiteVisitImageType[],
  ): Promise<{ criteria: VisualCriteriaMap; overallVisualScore: number }> {
    if (!this.model) {
      throw new Error('AI vision model is not configured. Cannot perform a site visual analysis right now.');
    }

    const imageParts: Part[] = [];
    for (const type of imageTypes) {
      const image = await this.fetchImageBuffer(lat, lng, type);
      if (image) {
        imageParts.push({
          inlineData: { data: image.buffer.toString('base64'), mimeType: image.contentType },
        });
      }
    }

    if (imageParts.length === 0) {
      throw new Error('Could not fetch any site imagery to analyze for this location.');
    }

    const prompt = `You are performing a visual site inspection for a potential retail/commercial location called "${locationName}", based ONLY on the ${imageParts.length} real attached image(s) (${imageTypes.join(', ')} view${imageTypes.length > 1 ? 's' : ''}).

Score each of these 5 criteria from 0-100 based ONLY on what is visibly present in the attached images:
- storefrontVisibility: how visible/prominent a storefront placed here would be to passersby
- roadWidthAccess: width and accessibility of the road(s) and access points visible
- trafficVisibility: visible evidence of vehicle/pedestrian traffic or activity
- buildingTypes: nature of surrounding buildings (commercial vs residential vs industrial, condition)
- areaCondition: general upkeep, cleanliness, and infrastructure quality of the area

STRICT RULES:
- Base every score and justification strictly on what is visibly present in the attached images. Never invent or assume something not visible.
- If the images don't show enough to judge a criterion confidently, give a moderate score (around 40-60) and say so plainly in the justification rather than guessing wildly.
- Respond with ONLY a JSON object mapping each of these exact keys to {"score": <number 0-100>, "justification": "<one short sentence>"}: ${CRITERION_KEYS.join(', ')}
- No markdown fences, no extra commentary outside the JSON object.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
      });
      const text =
        result.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI vision analysis returned an unreadable response.');
      }

      const criteria = {} as VisualCriteriaMap;
      for (const key of CRITERION_KEYS) {
        const entry = parsed[key];
        if (!entry || typeof entry.score !== 'number' || typeof entry.justification !== 'string' || !entry.justification.trim()) {
          throw new Error(`AI vision analysis is missing a valid "${key}" score.`);
        }
        criteria[key] = {
          score: Math.max(0, Math.min(100, Math.round(entry.score))),
          justification: entry.justification.trim(),
        };
      }

      const overallVisualScore = Math.round(
        CRITERION_KEYS.reduce((sum, key) => sum + criteria[key].score * CRITERION_WEIGHTS[key], 0),
      );

      return { criteria, overallVisualScore };
    } catch (err: any) {
      this.logger.error(`Site visual analysis error: ${err.message}`);
      throw new Error('Could not complete AI visual analysis for this site — please try again.');
    }
  }
}

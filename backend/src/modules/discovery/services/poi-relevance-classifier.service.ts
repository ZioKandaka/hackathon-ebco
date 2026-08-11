import { Injectable, Logger } from '@nestjs/common';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

// Fixed canonical taxonomy of `poi_type_strd` values in
// bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold — the only valid categories
// a nearby-POI classification may select from.
export const POI_TYPE_STRD_CATEGORIES = [
  'shopping_mall',
  'convenience_store',
  'market',
  'department_store',
  'hospital',
  'cafe',
  'clothing_store',
  'tourist_attraction',
  'restaurant',
  'finance',
  'coffee_shop',
  'bakery',
  'travel_agency',
  'store',
  'corporate_office',
  'private_guest_room',
  'university',
  'wholesaler',
  'supermarket',
  'other',
  'pharmacy',
  'school',
  'indonesian_restaurant',
  'hotel',
];

@Injectable()
export class PoiRelevanceClassifierService {
  private readonly logger = new Logger(PoiRelevanceClassifierService.name);
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
   * Asks Vertex AI which of the fixed `poi_type_strd` categories are genuinely relevant
   * to show as "nearby POI" pins for a given business type (may be zero, one, or several —
   * never a hallucinated category outside the fixed taxonomy).
   */
  async classifyRelevantCategories(businessType: string): Promise<string[]> {
    if (!this.model) {
      throw new Error(
        'AI category classifier is not configured. Cannot determine relevant nearby POI types right now.',
      );
    }

    const prompt = `You are selecting which POI categories are genuinely relevant to show as "nearby points of interest" pins for a business of type "${businessType}".

The ONLY valid categories you may choose from (this is the complete, fixed list — never invent others) are:
${POI_TYPE_STRD_CATEGORIES.join(', ')}

Rules:
- Return a JSON array of category strings, using only exact values from the list above.
- Only include categories that are directly relevant to "${businessType}" itself — same-type peers or closely related businesses a customer of "${businessType}" would actually look for nearby (e.g. competitors, complementary services in the same vertical).
- Do NOT include categories just because they generate foot traffic or demand for "${businessType}" (e.g. schools/offices are demand drivers for a coffee shop, not relevant nearby POI to display).
- If none of the categories are genuinely relevant to "${businessType}", return an empty array [].
- Respond with ONLY the JSON array — no explanation, no markdown fences.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text =
        result.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      const validCategories = new Set(POI_TYPE_STRD_CATEGORIES);
      return parsed.filter((c: any) => typeof c === 'string' && validCategories.has(c));
    } catch (err: any) {
      this.logger.error(`POI relevance classification error: ${err.message}`);
      throw new Error(
        `Couldn't determine relevant nearby POI categories for "${businessType}" — please try again.`,
      );
    }
  }

  /**
   * Asks Vertex AI which of the fixed `poi_type_strd` categories generate DEMAND (foot traffic /
   * customers) for a given business type — the opposite question from classifyRelevantCategories,
   * which finds peer/competitor categories. A coffee shop's demand drivers are schools and
   * offices, not other coffee shops.
   */
  async classifyDemandDriverCategories(businessType: string): Promise<string[]> {
    if (!this.model) {
      throw new Error(
        'AI category classifier is not configured. Cannot determine demand-driver POI types right now.',
      );
    }

    const prompt = `You are selecting which POI categories generate DEMAND (foot traffic, potential customers) for a business of type "${businessType}".

The ONLY valid categories you may choose from (this is the complete, fixed list — never invent others) are:
${POI_TYPE_STRD_CATEGORIES.join(', ')}

Rules:
- Return a JSON array of category strings, using only exact values from the list above.
- Only include categories whose presence nearby would plausibly bring customers TO "${businessType}" (e.g. schools/offices bring customers to a coffee shop) — this is about who generates demand, not who the business competes with.
- Do NOT include "${businessType}" itself or its direct same-type peers/competitors — that is a separate concern (competition), not demand.
- If none of the categories are genuine demand drivers for "${businessType}", return an empty array [].
- Respond with ONLY the JSON array — no explanation, no markdown fences.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text =
        result.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      const validCategories = new Set(POI_TYPE_STRD_CATEGORIES);
      return parsed.filter((c: any) => typeof c === 'string' && validCategories.has(c));
    } catch (err: any) {
      this.logger.error(`Demand-driver classification error: ${err.message}`);
      throw new Error(
        `Couldn't determine demand-driver POI categories for "${businessType}" — please try again.`,
      );
    }
  }
}

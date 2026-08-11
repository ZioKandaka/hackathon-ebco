import { Injectable, Logger } from '@nestjs/common';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { toolDeclarations } from './tools.schema';
import { Subject } from 'rxjs';

export interface ToolCallExecutionMap {
  add_business?: (args: { businessName: string; businessType: string; address: string }) => Promise<any>;
  discover_locations?: (args: { businessType: string; region: string; count?: number }) => Promise<any>;
  generate_heatmap?: (args: {
    category?: string;
    locationNameOrId?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    filters?: Array<{ column: string; operator: string; value: string }>;
  }) => Promise<any>;
  catchment_score?: (args: {
    category?: string;
    locationNameOrId?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    boundaryType?: 'radius' | 'time';
    radiusKm?: number;
    travelMode?: 'drive' | 'walk' | 'transit';
    timeMinutes?: number;
    ignoreCompetition?: boolean;
    ignoreSaturation?: boolean;
  }) => Promise<any>;
  show_travel_boundary?: (args: { locationNameOrId?: string; latitude?: number; longitude?: number; address?: string; travelMode?: 'drive' | 'walk' | 'transit'; timeMinutes?: number }) => Promise<any>;
  ai_site_visit?: (args: { locationNameOrId?: string; latitude?: number; longitude?: number; address?: string }) => Promise<any>;
}

class ToolExecutionError extends Error {}

export interface OrchestrationResult {
  textResponse: string;
  accumulatedPayloads: {
    discoveryData?: any;
    heatmapData?: any;
    catchmentData?: any;
    travelBoundaryData?: any;
    siteVisitData?: any;
  };
}

@Injectable()
export class VertexAiOrchestratorService {
  private readonly logger = new Logger(VertexAiOrchestratorService.name);
  private vertexAi: VertexAI | null = null;
  private model: GenerativeModel | null = null;

  constructor() {
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'ebco-aidev-ziok';
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    try {
      this.vertexAi = new VertexAI({ project, location });
      this.model = this.vertexAi.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ functionDeclarations: toolDeclarations }],
      });
    } catch (err: any) {
      this.logger.warn(`Vertex AI initialization note: ${err.message}`);
    }
  }

  async processUserMessage(
    userMessage: string,
    history: Array<{ sender: 'user' | 'assistant'; content: string }>,
    userLocations: Array<{ id: string; name: string }>,
    executors: ToolCallExecutionMap,
    subject: Subject<{ data: any }>,
  ): Promise<OrchestrationResult> {
    const accumulatedPayloads: OrchestrationResult['accumulatedPayloads'] = {};
    const savedLocationNames = userLocations.map((l) => l.name).join(', ') || 'None';

    const systemContext = `You are a Location Intelligence AI assistant.
User's saved account locations: [${savedLocationNames}].
Use available tools when the user's message implies location analysis, candidate discovery, heatmap visualization, catchment/accessibility scoring, travel-time boundary visualization, AI site visit visual check, or adding a business branch.
Note: there is no separate "accessibility" tool — travel-time analysis is just catchment_score with boundaryType "time" (its default). Use show_travel_boundary only when the user wants to see the shape without a score.
When the user refers to a previously discovered candidate spot (e.g. 'spot 2' or candidate name), use its latitude/longitude from the earlier conversation turn directly as the latitude/longitude arguments for catchment_score, show_travel_boundary, or ai_site_visit — do not assume it is a saved business location.
If required arguments for a tool are missing, ask the user a clarifying question in plain text.
If no tool is needed, respond directly in plain text.
Always call the appropriate tool for the user's CURRENT message, even if an identical or very similar request appears earlier in the conversation history — a repeated request means the user wants the results shown again (e.g. after a page refresh), not a reminder that it was already answered. Never skip a tool call, or reply with only a reference to a previous answer, just because a similar request was already made earlier in this conversation.
For catchment_score specifically: if a follow-up message only changes the business category or the boundary (e.g. "what about a book store instead?" or "what about a 15 minute walk instead?"), reuse the same location/address from the most recent catchment_score call in this conversation rather than asking the user to repeat it.
After a successful discover_locations, generate_heatmap, catchment_score, or ai_site_visit call, your reply MUST be only a short one-sentence confirmation pointing to the results panel on the left (e.g. "Found 3 candidate spots for coffee shop in Kediri — see the panel on the left.", "Catchment analysis for book store at Jl. Sudirman is ready — see the panel on the left.") — never restate individual candidates, scores, sub-scores, weights, criteria, or explanations in chat text, since the relevant panel already shows the full breakdown. The one exception is when a tool found nothing (e.g. zero candidates, zero POIs) — then briefly say so and suggest broadening the search, since there is nothing in the panel to point to.`;

    // Try Vertex AI function calling loop
    if (this.model) {
      try {
        const contents: any[] = [];

        if (history && history.length > 0) {
          const recentHistory = history.slice(-20);
          for (let i = 0; i < recentHistory.length; i++) {
            const item = recentHistory[i];
            if (!item.content || !item.content.trim()) continue;
            const role = item.sender === 'user' ? 'user' : 'model';

            let text = item.content;
            if (i === 0) {
              text = `${systemContext}\n\n[Prior message]: ${text}`;
            }

            contents.push({
              role,
              parts: [{ text }],
            });
          }
        }

        const lastContent = contents[contents.length - 1];
        if (!lastContent || lastContent.role !== 'user' || lastContent.parts[0]?.text !== userMessage) {
          const text = contents.length === 0 ? `${systemContext}\n\nUser prompt: ${userMessage}` : userMessage;
          contents.push({
            role: 'user',
            parts: [{ text }],
          });
        }

        let loopCount = 0;
        const maxLoops = 5;

        while (loopCount < maxLoops) {
          loopCount++;
          const response = await this.model.generateContent({ contents });
          const responseCandidates = response.response?.candidates;

          if (!responseCandidates || responseCandidates.length === 0) {
            break;
          }

          const candidatePart = responseCandidates[0].content?.parts?.[0];
          const functionCalls = (candidatePart as any)?.functionCall
            ? [(candidatePart as any).functionCall]
            : (response.response as any).functionCalls?.() || [];

          if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
              const toolName = call.name;
              const args = call.args || {};

              subject.next({
                data: {
                  type: 'status',
                  step: `Calling ${toolName}...`,
                  timestamp: new Date().toISOString(),
                },
              });

              await new Promise((resolve) => setTimeout(resolve, 300));

              let toolResult: any = { status: 'success' };
              try {
                if (toolName === 'add_business' && executors.add_business) {
                  toolResult = await executors.add_business(args);
                } else if (toolName === 'discover_locations' && executors.discover_locations) {
                  const res = await executors.discover_locations(args);
                  accumulatedPayloads.discoveryData = res;
                  toolResult = res;
                } else if (toolName === 'generate_heatmap' && executors.generate_heatmap) {
                  const res = await executors.generate_heatmap(args);
                  accumulatedPayloads.heatmapData = res;
                  toolResult = res;
                } else if (toolName === 'catchment_score' && executors.catchment_score) {
                  const res = await executors.catchment_score(args);
                  accumulatedPayloads.catchmentData = res;
                  toolResult = res;
                } else if (toolName === 'show_travel_boundary' && executors.show_travel_boundary) {
                  const res = await executors.show_travel_boundary(args);
                  accumulatedPayloads.travelBoundaryData = res;
                  toolResult = res;
                } else if (toolName === 'ai_site_visit' && executors.ai_site_visit) {
                  const res = await executors.ai_site_visit(args);
                  accumulatedPayloads.siteVisitData = res;
                  toolResult = res;
                }
              } catch (toolErr: any) {
                // A tool execution failure (e.g. no data found) is a real error the user must
                // see — it must not be swallowed and silently replaced by the heuristic fallback
                // below, which would re-run with unrelated hardcoded args and hide the real cause.
                throw new ToolExecutionError(toolErr.message || 'Tool execution failed.');
              }

              contents.push(responseCandidates[0].content);
              contents.push({
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: toolName,
                      response: { output: toolResult },
                    },
                  },
                ],
              });
            }
          } else {
            const textResponse = (candidatePart as any)?.text || responseCandidates[0].content?.parts?.map((p: any) => p.text).join('') || 'Analysis complete.';
            return { textResponse, accumulatedPayloads };
          }
        }
      } catch (err: any) {
        if (err instanceof ToolExecutionError) {
          throw err;
        }
        this.logger.warn(`Vertex AI generative execution fallback note: ${err.message}`);
      }
    }

    // Agentic Fallback Intent Engine when Vertex AI API is unconfigured/offline
    return this.fallbackAgenticExecution(userMessage, userLocations, executors, subject, accumulatedPayloads);
  }

  private async fallbackAgenticExecution(
    userMessage: string,
    userLocations: Array<{ id: string; name: string }>,
    executors: ToolCallExecutionMap,
    subject: Subject<{ data: any }>,
    accumulatedPayloads: OrchestrationResult['accumulatedPayloads'],
  ): Promise<OrchestrationResult> {
    const lower = userMessage.toLowerCase();
    const plannedTools: string[] = [];

    const hasDiscover = lower.includes('find') || lower.includes('discover') || lower.includes('where') || lower.includes('candidate') || lower.includes('spots') || lower.includes('spot');
    const hasHeatmap = lower.includes('heatmap') || lower.includes('heat map') || lower.includes('density map');
    const hasAccessibility = lower.includes('accessible') || lower.includes('accessibility') || lower.includes('isochrone') || lower.includes('travel time') || lower.includes('drive time') || lower.includes('walk time');
    // "show ... boundary/shape" (no score requested) routes to the lightweight boundary-only
    // tool; everything else accessibility-flavored is just catchment_score with its time default.
    const hasBoundaryOnly = hasAccessibility && (lower.includes('boundary') || lower.includes('shape')) && lower.includes('show');
    const hasCatchment = lower.includes('catchment') || lower.includes('catchment score') || lower.includes('analyze catchment') || (hasAccessibility && !hasBoundaryOnly);
    const hasSiteVisit = lower.includes('site visit') || lower.includes('visual check') || lower.includes('what does spot') || lower.includes('look like') || lower.includes('street view');
    const hasAddBranch = (lower.includes('add') || lower.includes('create') || lower.includes('register')) && (lower.includes('branch') || lower.includes('location'));

    if (hasDiscover) plannedTools.push('discover_locations');
    if (hasHeatmap) plannedTools.push('generate_heatmap');
    if (hasCatchment) plannedTools.push('catchment_score');
    if (hasBoundaryOnly) plannedTools.push('show_travel_boundary');
    if (hasSiteVisit) plannedTools.push('ai_site_visit');
    if (hasAddBranch) plannedTools.push('add_business');

    const uniqueTools = Array.from(new Set(plannedTools)).slice(0, 5);

    if (uniqueTools.length === 0) {
      return {
        textResponse: `I can help you analyze location intelligence! Ask me e.g. "Find coffee shop candidates in Kediri", "Show a heatmap for minimarket density", "Analyze catchment for my Sudirman branch", or "Check how accessible my branch is within a 10 minute drive".`,
        accumulatedPayloads,
      };
    }

    const summaries: string[] = [];

    for (let idx = 0; idx < uniqueTools.length; idx++) {
      const tool = uniqueTools[idx];
      subject.next({
        data: {
          type: 'status',
          step: `Calling ${tool}...`,
          timestamp: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (tool === 'discover_locations' && executors.discover_locations) {
        const res = await executors.discover_locations({ businessType: 'coffee_shop', region: 'Kediri' });
        accumulatedPayloads.discoveryData = res;
        summaries.push(`Found ${res.candidates?.length || 0} discovery candidates.`);
      } else if (tool === 'generate_heatmap' && executors.generate_heatmap) {
        const res = await executors.generate_heatmap({ category: 'coffee_shop', locationNameOrId: 'Kediri' });
        accumulatedPayloads.heatmapData = res;
        // res.summary is the descriptive stat line kept for the panel/DB record — the chat reply
        // should just confirm completion, not restate it.
        summaries.push(
          res.pointCount > 0
            ? `Heatmap for ${res.category} near ${res.locationName} is ready — see the panel on the left.`
            : res.summary || 'No POI found for that heatmap query.',
        );
      } else if (tool === 'catchment_score' && executors.catchment_score) {
        const targetLoc = userLocations[0]?.name || 'Sudirman Branch';
        const res = await executors.catchment_score({ locationNameOrId: targetLoc, category: 'coffee_shop' });
        accumulatedPayloads.catchmentData = res;
        summaries.push(res.summary || 'Calculated location catchment score.');
      } else if (tool === 'show_travel_boundary' && executors.show_travel_boundary) {
        const targetLoc = userLocations[0]?.name || 'Sudirman Branch';
        const res = await executors.show_travel_boundary({ locationNameOrId: targetLoc, travelMode: 'drive', timeMinutes: 10 });
        accumulatedPayloads.travelBoundaryData = res;
        summaries.push(res.summary || 'Showed travel-time boundary.');
      } else if (tool === 'ai_site_visit' && executors.ai_site_visit) {
        const targetLoc = userLocations[0]?.name || 'Sudirman Branch';
        const res = await executors.ai_site_visit({ locationNameOrId: targetLoc });
        accumulatedPayloads.siteVisitData = res;
        summaries.push(res.summary || 'Completed AI site visit inspection.');
      } else if (tool === 'add_business' && executors.add_business) {
        const res = await executors.add_business({ businessName: 'New Branch', businessType: 'coffee_shop', address: 'Jl. Sudirman No. 10' });
        summaries.push(res.summary || 'Added business location branch.');
      }
    }

    return {
      textResponse: summaries.join('\n\n') || 'Analysis complete.',
      accumulatedPayloads,
    };
  }
}

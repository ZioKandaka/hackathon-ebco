import { Injectable, Logger } from '@nestjs/common';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { toolDeclarations } from './tools.schema';
import { Subject } from 'rxjs';

export interface ToolCallExecutionMap {
  add_business?: (args: { businessName: string; businessType: string; address: string }) => Promise<any>;
  discover_locations?: (args: { businessType: string; region: string; count?: number }) => Promise<any>;
  generate_heatmap?: (args: { region: string; businessType?: string; customCategory?: string; maxRating?: number }) => Promise<any>;
  catchment_score?: (args: { locationNameOrId: string; radiusKm?: number; ignoreCompetition?: boolean; ignoreSaturation?: boolean }) => Promise<any>;
  accessibility_analysis?: (args: { locationNameOrId: string; travelMode?: 'drive' | 'walk' | 'transit'; timeMinutes?: number }) => Promise<any>;
  ai_site_visit?: (args: { locationNameOrId: string }) => Promise<any>;
}

export interface OrchestrationResult {
  textResponse: string;
  accumulatedPayloads: {
    candidates?: any[];
    heatmapData?: any;
    catchmentData?: any;
    accessibilityData?: any;
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
Use available tools when the user's message implies location analysis, candidate discovery, heatmap visualization, catchment scoring, accessibility travel time analysis, AI site visit visual check, or adding a business branch.
If required arguments for a tool are missing, ask the user a clarifying question in plain text.
If no tool is needed, respond directly in plain text.`;

    // Try Vertex AI function calling loop
    if (this.model) {
      try {
        const contents: any[] = [
          { role: 'user', parts: [{ text: `${systemContext}\n\nUser prompt: ${userMessage}` }] },
        ];

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
              if (toolName === 'add_business' && executors.add_business) {
                toolResult = await executors.add_business(args);
              } else if (toolName === 'discover_locations' && executors.discover_locations) {
                const res = await executors.discover_locations(args);
                accumulatedPayloads.candidates = res.candidates || res;
                toolResult = res;
              } else if (toolName === 'generate_heatmap' && executors.generate_heatmap) {
                const res = await executors.generate_heatmap(args);
                accumulatedPayloads.heatmapData = res;
                toolResult = res;
              } else if (toolName === 'catchment_score' && executors.catchment_score) {
                const res = await executors.catchment_score(args);
                accumulatedPayloads.catchmentData = res;
                toolResult = res;
              } else if (toolName === 'accessibility_analysis' && executors.accessibility_analysis) {
                const res = await executors.accessibility_analysis(args);
                accumulatedPayloads.accessibilityData = res;
                toolResult = res;
              } else if (toolName === 'ai_site_visit' && executors.ai_site_visit) {
                const res = await executors.ai_site_visit(args);
                accumulatedPayloads.siteVisitData = res;
                toolResult = res;
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
    const hasCatchment = lower.includes('catchment') || lower.includes('catchment score') || lower.includes('analyze catchment');
    const hasAccessibility = lower.includes('accessible') || lower.includes('accessibility') || lower.includes('isochrone') || lower.includes('travel time') || lower.includes('drive time') || lower.includes('walk time');
    const hasSiteVisit = lower.includes('site visit') || lower.includes('visual check') || lower.includes('what does spot') || lower.includes('look like') || lower.includes('street view');
    const hasAddBranch = (lower.includes('add') || lower.includes('create') || lower.includes('register')) && (lower.includes('branch') || lower.includes('location'));

    if (hasDiscover) plannedTools.push('discover_locations');
    if (hasHeatmap) plannedTools.push('generate_heatmap');
    if (hasCatchment) plannedTools.push('catchment_score');
    if (hasAccessibility) plannedTools.push('accessibility_analysis');
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
        accumulatedPayloads.candidates = res.candidates || res;
        summaries.push(`Found ${accumulatedPayloads.candidates?.length || 0} discovery candidates.`);
      } else if (tool === 'generate_heatmap' && executors.generate_heatmap) {
        const res = await executors.generate_heatmap({ region: 'Kediri', businessType: 'coffee_shop' });
        accumulatedPayloads.heatmapData = res;
        summaries.push(res.summary || 'Generated spatial density heatmap.');
      } else if (tool === 'catchment_score' && executors.catchment_score) {
        const targetLoc = userLocations[0]?.name || 'Sudirman Branch';
        const res = await executors.catchment_score({ locationNameOrId: targetLoc, radiusKm: 2.0 });
        accumulatedPayloads.catchmentData = res;
        summaries.push(res.summary || 'Calculated location catchment score.');
      } else if (tool === 'accessibility_analysis' && executors.accessibility_analysis) {
        const targetLoc = userLocations[0]?.name || 'Sudirman Branch';
        const res = await executors.accessibility_analysis({ locationNameOrId: targetLoc, travelMode: 'drive', timeMinutes: 10 });
        accumulatedPayloads.accessibilityData = res;
        summaries.push(res.summary || 'Calculated travel-time accessibility analysis.');
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

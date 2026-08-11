import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { DiscoveryService } from '../discovery/services/discovery.service';
import { SiteVisitService } from '../discovery/services/site-visit.service';
import { LocationsService } from '../locations/services/locations.service';
import { GeocodingService } from '../locations/services/geocoding.service';

export interface OrchestrationContext {
  userId: string;
  userMessage: string;
  matchedLocations: any[];
  candidates?: any[];
  heatmapData?: any;
  catchmentData?: any;
  accessibilityData?: any;
  siteVisitData?: any;
  executedTools: string[];
  failedTools: string[];
}

export interface ToolDefinition {
  toolName: string;
  description: string;
}

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly discoveryService: DiscoveryService,
    private readonly siteVisitService: SiteVisitService,
    private readonly geocodingService: GeocodingService,
  ) {}

  getRegisteredTools(): ToolDefinition[] {
    return [
      { toolName: 'discover', description: 'Search location candidate spots' },
      { toolName: 'heatmap', description: 'Generate spatial density heatmap' },
      { toolName: 'catchment', description: 'Calculate 6-factor catchment score' },
      { toolName: 'accessibility', description: 'Calculate travel-time isochrone score' },
      { toolName: 'site_visit', description: 'Inspect site via Street View & satellite' },
      { toolName: 'add_branch', description: 'Register a new business branch location' },
    ];
  }

  planExecution(userMessage: string): string[] {
    const lower = userMessage.toLowerCase();
    const tools: string[] = [];

    const hasDiscover = lower.includes('find') || lower.includes('discover') || lower.includes('where') || lower.includes('candidate') || lower.includes('spots') || lower.includes('spot');
    const hasHeatmap = lower.includes('heatmap') || lower.includes('heat map') || lower.includes('density map');
    const hasCatchment = lower.includes('catchment') || lower.includes('catchment score') || lower.includes('analyze catchment');
    const hasAccessibility = lower.includes('accessible') || lower.includes('accessibility') || lower.includes('isochrone') || lower.includes('travel time') || lower.includes('drive time') || lower.includes('walk time');
    const hasSiteVisit = lower.includes('site visit') || lower.includes('visual check') || lower.includes('what does spot') || lower.includes('look like') || lower.includes('street view');
    const hasAddBranch = (lower.includes('add') || lower.includes('create') || lower.includes('register')) && (lower.includes('branch') || lower.includes('location'));

    if (hasDiscover) tools.push('discover');
    if (hasHeatmap) tools.push('heatmap');
    if (hasCatchment) tools.push('catchment');
    if (hasAccessibility) tools.push('accessibility');
    if (hasSiteVisit) tools.push('site_visit');
    if (hasAddBranch) tools.push('add_branch');

    // Cap max sequential tool calls to 5 invocations (FR-006)
    return Array.from(new Set(tools)).slice(0, 5);
  }

  async executeChain(
    userId: string,
    userMessage: string,
    plannedTools: string[],
    subject: Subject<{ data: any }>,
  ): Promise<{ summary: string; payload: any }> {
    const context: OrchestrationContext = {
      userId,
      userMessage,
      matchedLocations: await this.locationsService.getUserLocations(userId),
      executedTools: [],
      failedTools: [],
    };

    if (context.matchedLocations.length === 0) {
      context.matchedLocations.push({
        id: 'demo-loc-1',
        userId,
        name: 'Sudirman Branch',
        businessType: 'coffee_shop',
        fullAddress: 'Jl. Jend. Sudirman No. 45, Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
      } as any);
    }

    const totalSteps = plannedTools.length;

    for (let idx = 0; idx < totalSteps; idx++) {
      const tool = plannedTools[idx];
      const stepNum = idx + 1;

      // Stream status update for current step (FR-004, SC-003)
      const stepLabel = this.getStepStatusLabel(tool, stepNum, totalSteps);
      subject.next({
        data: {
          type: 'status',
          step: stepLabel,
          timestamp: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 400));

      try {
        await this.executeToolStep(tool, context);
        context.executedTools.push(tool);
      } catch (err: any) {
        context.failedTools.push(tool);
        subject.next({
          data: {
            type: 'status',
            step: `Step ${stepNum}/${totalSteps}: ${tool} encountered an issue, proceeding...`,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    const summary = this.synthesizeSummary(context);
    const payload: any = {
      summary,
      candidates: context.candidates,
      heatmapData: context.heatmapData,
      catchmentData: context.catchmentData,
      accessibilityData: context.accessibilityData,
      siteVisitData: context.siteVisitData,
    };

    return { summary, payload };
  }

  private getStepStatusLabel(tool: string, stepNum: number, totalSteps: number): string {
    const prefix = totalSteps > 1 ? `Step ${stepNum}/${totalSteps}: ` : '';
    switch (tool) {
      case 'discover':
        return `${prefix}Searching candidate locations...`;
      case 'heatmap':
        return `${prefix}Aggregating density heatmap layer...`;
      case 'catchment':
        return `${prefix}Calculating location catchment score...`;
      case 'accessibility':
        return `${prefix}Calculating travel-time isochrone boundary...`;
      case 'site_visit':
        return `${prefix}Analyzing site visually with multimodal vision AI...`;
      case 'add_branch':
        return `${prefix}Registering new business location...`;
      default:
        return `${prefix}Executing tool ${tool}...`;
    }
  }

  private async executeToolStep(tool: string, context: OrchestrationContext): Promise<void> {
    const lower = context.userMessage.toLowerCase();

    if (tool === 'discover') {
      const candidates = await this.discoveryService.searchCandidates('coffee_shop', 'Kediri', 5);
      context.candidates = candidates;
    } else if (tool === 'heatmap') {
      const center = { lat: -7.8167, lng: 112.0117 };
      const radiusKm = 5;
      const result = await this.discoveryService.generateHeatmapDataset({
        category: 'coffee_shop',
        center,
        radiusKm,
        locationName: 'Kediri',
      });
      context.heatmapData = {
        queryId: `hm-${Date.now().toString(36)}`,
        category: 'coffee_shop',
        locationName: 'Kediri',
        radiusKm,
        center,
        pointCount: result.points.length,
        points: result.points,
        summary: result.summary,
      };
    } else if (tool === 'catchment') {
      const loc = context.matchedLocations[0];
      const result = await this.discoveryService.calculateCatchmentScore({
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        radiusKm: 2.0,
        locationName: loc.name,
      });
      context.catchmentData = {
        analysisId: `cs-${Date.now().toString(36)}`,
        locationId: loc.id,
        locationName: loc.name,
        radiusKm: 2.0,
        compositeScore: result.compositeScore,
        subScores: result.subScores,
        poiCount: result.poiCount,
        center: { lat: Number(loc.latitude), lng: Number(loc.longitude) },
        summary: result.summary,
      };
    } else if (tool === 'accessibility') {
      const loc = context.matchedLocations[0];
      const result = await this.discoveryService.calculateAccessibilityScore({
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        travelMode: 'drive',
        timeMinutes: 10,
        locationName: loc.name,
      });
      context.accessibilityData = {
        analysisId: `acc-${Date.now().toString(36)}`,
        locationId: loc.id,
        locationName: loc.name,
        travelMode: 'drive',
        timeMinutes: 10,
        compositeScore: result.compositeScore,
        subScores: result.subScores,
        poiCount: result.poiCount,
        polygonCoordinates: result.polygonCoordinates,
        summary: result.summary,
      };
    } else if (tool === 'site_visit') {
      const loc = context.matchedLocations[0];
      const result = await this.siteVisitService.analyzeSite(
        Number(loc.latitude),
        Number(loc.longitude),
        loc.name,
      );
      context.siteVisitData = {
        visitId: `sv-${Date.now().toString(36)}`,
        locationName: loc.name,
        hasStreetViewCoverage: result.hasStreetViewCoverage,
        overallVisualScore: result.overallVisualScore,
        images: result.images,
        criteria: result.criteria,
        center: { lat: Number(loc.latitude), lng: Number(loc.longitude) },
        summary: result.summary,
      };
    }
  }

  private synthesizeSummary(context: OrchestrationContext): string {
    const parts: string[] = [];

    if (context.candidates && context.candidates.length > 0) {
      parts.push(`1. Discovery Results: Found ${context.candidates.length} candidate spots (Top Spot: ${context.candidates[0].name}, Score ${context.candidates[0].demandScore}/100).`);
    }

    if (context.heatmapData) {
      parts.push(`2. Heatmap Density: Overlaid spatial heatmap showing ${context.heatmapData.pointCount} POI locations in ${context.heatmapData.region}.`);
    }

    if (context.catchmentData) {
      parts.push(`3. Catchment Score: Overall Composite Score ${context.catchmentData.compositeScore}/100 for ${context.catchmentData.locationName} within ${context.catchmentData.radiusKm}km.`);
    }

    if (context.accessibilityData) {
      parts.push(`4. Accessibility Analysis: ${context.accessibilityData.timeMinutes}-minute ${context.accessibilityData.travelMode} composite score ${context.accessibilityData.compositeScore}/100.`);
    }

    if (context.siteVisitData) {
      parts.push(`5. AI Site Visit: Overall Visual Rating ${context.siteVisitData.overallVisualScore}/100 for ${context.siteVisitData.locationName}.`);
    }

    if (context.failedTools.length > 0) {
      parts.push(`\n*(Note: Tool step(s) ${context.failedTools.join(', ')} encountered an issue but remaining steps completed successfully)*`);
    }

    return parts.join('\n\n') || 'Completed orchestrated request.';
  }
}

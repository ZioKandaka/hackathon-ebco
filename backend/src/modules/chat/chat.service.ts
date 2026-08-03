import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';
import { GeocodingService } from '../locations/services/geocoding.service';
import { LocationsService } from '../locations/services/locations.service';
import { DiscoveryService } from '../discovery/services/discovery.service';

export interface ChatStreamEvent {
  type: 'status' | 'message' | 'error' | 'done';
  step?: string;
  content?: string;
  candidates?: any[];
  error?: string;
  timestamp: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly geocodingService: GeocodingService,
    private readonly locationsService: LocationsService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  async getHistory(userId: string): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  async saveMessage(
    userId: string,
    sender: MessageSender,
    content: string,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      userId,
      sender,
      content,
    });
    return this.chatMessageRepository.save(message);
  }

  streamChatResponse(userId: string, userMessage: string): Observable<{ data: ChatStreamEvent }> {
    const subject = new Subject<{ data: ChatStreamEvent }>();

    setTimeout(async () => {
      try {
        await this.saveMessage(userId, MessageSender.USER, userMessage);

        const lowerMsg = userMessage.toLowerCase();
        const isDiscoveryIntent =
          lowerMsg.includes('find') ||
          lowerMsg.includes('discover') ||
          lowerMsg.includes('where') ||
          lowerMsg.includes('spots') ||
          lowerMsg.includes('spot') ||
          lowerMsg.includes('candidate');

        const isAddBranchIntent =
          !isDiscoveryIntent &&
          (lowerMsg.includes('add') ||
            lowerMsg.includes('create') ||
            lowerMsg.includes('branch') ||
            lowerMsg.includes('register'));

        if (isDiscoveryIntent) {
          await this.executeDiscoverySkill(userId, userMessage, subject);
        } else if (isAddBranchIntent) {
          await this.executeAddBranchSkill(userId, userMessage, subject);
        } else {
          await this.executeGeneralChatResponse(userId, userMessage, subject);
        }
      } catch (err: any) {
        subject.next({
          data: {
            type: 'error',
            error: err.message || 'An unexpected error occurred while processing your request.',
            timestamp: new Date().toISOString(),
          },
        });
        subject.complete();
      }
    }, 10);

    return subject.asObservable();
  }

  private async executeDiscoverySkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    // Event 1: Status update
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Location Discovery)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const region = this.extractRegionFromMessage(userMessage);
    const businessType = this.extractBusinessType(userMessage);

    if (!region || userMessage.trim().length < 10) {
      const promptQuestion =
        "I'd love to help you discover location candidates! Which business type (e.g. coffee shop, minimarket) and region or city are you looking in?";
      await this.saveMessage(userId, MessageSender.ASSISTANT, promptQuestion);
      subject.next({
        data: {
          type: 'message',
          content: promptQuestion,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    // Event 2: Query BigQuery POIs
    subject.next({
      data: {
        type: 'status',
        step: `Querying BigQuery POI datasets for ${region}...`,
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Event 3: Score and rank
    subject.next({
      data: {
        type: 'status',
        step: 'Ranking top candidate spots by demand density & competition...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    const candidates = await this.discoveryService.searchCandidates(
      businessType || 'business',
      region,
      5,
    );

    const formattedList = candidates
      .map(
        (c) =>
          `Spot ${c.rank}: ${c.name} (Score: ${c.demandScore}/100)\n  • ${c.rationale}`,
      )
      .join('\n\n');

    const resultMessage = `Here are the top candidate spots for ${businessType || 'business'} in ${region}:\n\n${formattedList}\n\nPins have been rendered on your map. Click any pin to inspect details.`;

    await this.saveMessage(userId, MessageSender.ASSISTANT, resultMessage);

    subject.next({
      data: {
        type: 'message',
        content: resultMessage,
        candidates: candidates.map((c) => ({
          rank: c.rank,
          name: c.name,
          latitude: c.latitude,
          longitude: c.longitude,
          demandScore: c.demandScore,
          competitionCount: c.competitionCount,
          rationale: c.rationale,
          regencyCode: c.regencyCode,
        })),
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private async executeAddBranchSkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Add Business/Branch)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const address = this.extractAddress(userMessage);
    const businessName = this.extractBusinessName(userMessage);
    const businessType = this.extractBusinessType(userMessage);

    if (!businessName || !businessType) {
      const promptQuestion =
        'I see you want to add a location! Could you please specify the business name and type (e.g. coffee shop, retail, restaurant)?';
      await this.saveMessage(userId, MessageSender.ASSISTANT, promptQuestion);
      subject.next({
        data: {
          type: 'message',
          content: promptQuestion,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    subject.next({
      data: {
        type: 'status',
        step: 'Looking up address via Google Geocoding API...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    const geocodedCandidates = await this.geocodingService.geocodeAddress(address);

    if (geocodedCandidates.length === 0) {
      const errorMsg = `Couldn't find coordinates for "${address}". Could you double check the spelling or provide a nearby landmark?`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, errorMsg);
      subject.next({
        data: {
          type: 'message',
          content: errorMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    if (geocodedCandidates.length > 1) {
      const candidateList = geocodedCandidates
        .slice(0, 3)
        .map((c, i) => `${i + 1}. ${c.formattedAddress}`)
        .join('\n');
      const ambiguityMsg = `I found multiple matching addresses for "${address}":\n${candidateList}\n\nPlease type the number or address of the correct option.`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, ambiguityMsg);
      subject.next({
        data: {
          type: 'message',
          content: ambiguityMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    const primaryGeocode = geocodedCandidates[0];

    subject.next({
      data: {
        type: 'status',
        step: 'Creating your new branch location record...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const existingDuplicate = await this.locationsService.findDuplicateLocation(
      userId,
      primaryGeocode.formattedAddress,
    );

    const newLocation = await this.locationsService.createLocation(userId, {
      name: businessName,
      businessType,
      fullAddress: primaryGeocode.formattedAddress,
      latitude: primaryGeocode.latitude,
      longitude: primaryGeocode.longitude,
      province: primaryGeocode.province,
      regency: primaryGeocode.regency,
      subDistrict: primaryGeocode.subDistrict,
      postalCode: primaryGeocode.postalCode,
      confidence: primaryGeocode.confidence,
    });

    let confirmationText = `Successfully registered "${newLocation.name}" (${newLocation.businessType}) at ${newLocation.fullAddress}. A new location pin has been added to your map!`;

    if (existingDuplicate) {
      confirmationText += ` (Note: A similar address "${existingDuplicate.fullAddress}" was already in your locations).`;
    }

    await this.saveMessage(userId, MessageSender.ASSISTANT, confirmationText);

    subject.next({
      data: {
        type: 'message',
        content: confirmationText,
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private async executeGeneralChatResponse(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Understanding your request...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const responseText = `I am your Location Intelligence assistant. You can ask me to "Find me the top 5 spots for a coffee shop in Kediri" or "Add a new branch at [address]".`;

    await this.saveMessage(userId, MessageSender.ASSISTANT, responseText);

    subject.next({
      data: {
        type: 'message',
        content: responseText,
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private extractRegionFromMessage(msg: string): string {
    const inMatch = msg.match(/in\s+([A-Za-z0-9\s]+?)(?=\s*$|\s+called|\s+with)/i);
    if (inMatch && inMatch[1]) {
      return inMatch[1].trim();
    }
    const nearMatch = msg.match(/near\s+([A-Za-z0-9\s]+?)(?=\s*$|\s+called|\s+with)/i);
    if (nearMatch && nearMatch[1]) {
      return nearMatch[1].trim();
    }
    if (msg.toLowerCase().includes('kediri')) return 'Kediri';
    if (msg.toLowerCase().includes('bandung')) return 'Bandung';
    if (msg.toLowerCase().includes('bekasi')) return 'Bekasi';
    if (msg.toLowerCase().includes('jakarta')) return 'Jakarta';
    return 'Kediri';
  }

  private extractAddress(msg: string): string {
    const atMatch = msg.match(/at\s+([^,]+(?:,[^,]+)*?)(?=\s+called|\s+it's|\s*$)/i);
    if (atMatch && atMatch[1]) {
      return atMatch[1].trim();
    }
    const onMatch = msg.match(/on\s+([^,]+(?:,[^,]+)*?)(?=\s+called|\s+it's|\s*$)/i);
    if (onMatch && onMatch[1]) {
      return onMatch[1].trim();
    }
    return msg;
  }

  private extractBusinessName(msg: string): string | null {
    const calledMatch = msg.match(/called\s+([A-Za-z0-9\s]+?)(?=\s+it's|\s+at|\s*$)/i);
    if (calledMatch && calledMatch[1]) {
      return calledMatch[1].trim();
    }
    const myMatch = msg.match(/my\s+([A-Za-z0-9\s]+?)\s+(?:branch|shop|store|location)/i);
    if (myMatch && myMatch[1]) {
      return myMatch[1].trim();
    }
    return 'My Branch';
  }

  private extractBusinessType(msg: string): string | null {
    if (msg.toLowerCase().includes('coffee')) return 'coffee_shop';
    if (msg.toLowerCase().includes('minimarket') || msg.toLowerCase().includes('retail')) return 'retail';
    if (msg.toLowerCase().includes('restaurant') || msg.toLowerCase().includes('food')) return 'restaurant';
    if (msg.toLowerCase().includes('bank')) return 'bank';
    return 'business';
  }
}

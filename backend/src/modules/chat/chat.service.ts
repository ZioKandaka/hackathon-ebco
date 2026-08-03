import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';
import { GeocodingService } from '../locations/services/geocoding.service';
import { LocationsService } from '../locations/services/locations.service';

export interface ChatStreamEvent {
  type: 'status' | 'message' | 'error' | 'done';
  step?: string;
  content?: string;
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
        const isAddBranchIntent =
          lowerMsg.includes('add') ||
          lowerMsg.includes('create') ||
          lowerMsg.includes('branch') ||
          lowerMsg.includes('shop') ||
          lowerMsg.includes('store') ||
          lowerMsg.includes('location');

        if (isAddBranchIntent) {
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

  private async executeAddBranchSkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    // Event 1: Status update
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Add Business/Branch)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Extract basic information from user message
    const address = this.extractAddress(userMessage);
    const businessName = this.extractBusinessName(userMessage);
    const businessType = this.extractBusinessType(userMessage);

    // If name or type is completely missing, prompt user for missing details
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

    // Event 2: Geocoding lookup
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

    // Handle ambiguous address with multiple distinct candidate locations
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

    // Event 3: Check duplicates & Create Location
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

    const responseText = `I am your Location Intelligence assistant. You can ask me to "Add a new coffee shop branch at [address]" or explore heatmap analysis on the map.`;

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
    if (msg.toLowerCase().includes('retail') || msg.toLowerCase().includes('shop')) return 'retail';
    if (msg.toLowerCase().includes('restaurant') || msg.toLowerCase().includes('food')) return 'restaurant';
    if (msg.toLowerCase().includes('bank')) return 'bank';
    return 'business';
  }
}

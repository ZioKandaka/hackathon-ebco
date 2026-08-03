import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';

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

    // Process asynchronously and emit status updates over stream
    setTimeout(async () => {
      try {
        // Step 1: Save user message to database
        await this.saveMessage(userId, MessageSender.USER, userMessage);

        // Event 1: Status update
        subject.next({
          data: {
            type: 'status',
            step: 'Understanding your request...',
            timestamp: new Date().toISOString(),
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 600));

        // Event 2: Status update
        subject.next({
          data: {
            type: 'status',
            step: 'Determining the right action...',
            timestamp: new Date().toISOString(),
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 800));

        // Event 3: Status update
        subject.next({
          data: {
            type: 'status',
            step: 'Fetching required spatial data...',
            timestamp: new Date().toISOString(),
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 800));

        // Generate assistant response based on request context
        const responseText = `I have processed your query ("${userMessage}"). You can explore updated candidate locations or density layers directly on the map.`;

        // Save AI response to database
        await this.saveMessage(userId, MessageSender.ASSISTANT, responseText);

        // Event 4: Final Assistant Message
        subject.next({
          data: {
            type: 'message',
            content: responseText,
            timestamp: new Date().toISOString(),
          },
        });

        // Event 5: Done
        subject.next({
          data: {
            type: 'done',
            timestamp: new Date().toISOString(),
          },
        });

        subject.complete();
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
}

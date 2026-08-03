import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';

describe('ChatService', () => {
  let service: ChatService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ id: 'msg-uuid-1', ...entity, createdAt: new Date() }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHistory', () => {
    it('should query chat messages for user ID ordered by createdAt ASC', async () => {
      const userId = 'user-uuid-123';
      await service.getHistory(userId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'ASC' },
        take: 100,
      });
    });
  });

  describe('saveMessage', () => {
    it('should create and save a new user message', async () => {
      const userId = 'user-uuid-123';
      const content = 'Test message';

      const saved = await service.saveMessage(userId, MessageSender.USER, content);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        sender: MessageSender.USER,
        content,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(saved.id).toBe('msg-uuid-1');
    });
  });

  describe('streamChatResponse', () => {
    it('should return an Observable that emits status events', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Analyze location';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toBe('Understanding your request...');
          done();
        },
      });
    }, 5000);
  });
});

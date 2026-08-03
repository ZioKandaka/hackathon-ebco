import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Sse,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService, ChatStreamEvent } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history')
  async getHistory(@CurrentUser('id') userId: string) {
    const messages = await this.chatService.getHistory(userId);
    return { messages };
  }

  @Post('stream')
  @Sse()
  @HttpCode(HttpStatus.OK)
  streamChatMessage(
    @CurrentUser('id') userId: string,
    @Body() sendMessageDto: SendMessageDto,
  ): Observable<{ data: ChatStreamEvent }> {
    return this.chatService.streamChatResponse(userId, sendMessageDto.message);
  }
}

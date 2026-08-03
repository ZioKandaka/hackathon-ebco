import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { LocationsModule } from '../locations/locations.module';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), LocationsModule, DiscoveryModule],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { VertexAiOrchestratorService } from './vertexai-orchestrator.service';
import { ChatController } from './chat.controller';
import { LocationsModule } from '../locations/locations.module';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), LocationsModule, DiscoveryModule],
  providers: [ChatService, VertexAiOrchestratorService],
  controllers: [ChatController],
  exports: [ChatService, VertexAiOrchestratorService],
})
export class ChatModule {}

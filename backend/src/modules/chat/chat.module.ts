import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { OrchestratorService } from './orchestrator.service';
import { VertexAiOrchestratorService } from './vertexai-orchestrator.service';
import { ChatController } from './chat.controller';
import { LocationsModule } from '../locations/locations.module';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), LocationsModule, DiscoveryModule],
  providers: [ChatService, OrchestratorService, VertexAiOrchestratorService],
  controllers: [ChatController],
  exports: [ChatService, OrchestratorService, VertexAiOrchestratorService],
})
export class ChatModule {}

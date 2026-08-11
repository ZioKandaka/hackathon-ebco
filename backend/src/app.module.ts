import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { AppDataSource } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      // Fresh tables in local dev are convenient; production schema changes go through
      // migrations (see backend/src/database/migrations) so they're reviewable and reversible.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UsersModule,
    ChatModule,
    LocationsModule,
    DiscoveryModule,
  ],
})
export class AppModule {}
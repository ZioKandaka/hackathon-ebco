import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { User } from './modules/users/entities/user.entity';
import { ChatMessage } from './modules/chat/entities/chat-message.entity';
import { UserLocation } from './modules/locations/entities/user-location.entity';
import { IsochroneCache } from './modules/discovery/entities/isochrone-cache.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, ChatMessage, UserLocation, IsochroneCache],
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
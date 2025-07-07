import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DatabaseModule } from '../../database/database.module';
import { EmailService } from '../../email/email.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService],
})
export class AuthModule {}
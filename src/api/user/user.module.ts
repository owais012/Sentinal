import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from 'src/database/database.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { EmailService } from 'src/email/email.service';

@Module({
  imports: [
    DatabaseModule,
    RedisModule.forRoot({
          type: 'single',
          url: 'redis://localhost:6379',
    }),
  ],
  controllers: [UserController],
  providers: [UserService, EmailService],
})
export class UserModule {}

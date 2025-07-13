import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DatabaseModule } from '../../database/database.module';
import { EmailService } from '../../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleAuthService } from './google-auth.service';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
@Module({
  imports: [
    DatabaseModule,
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
    }),
    UserModule
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, UserService, JwtService, GoogleAuthService],
})
export class AuthModule {}
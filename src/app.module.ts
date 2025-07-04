import { 
  Module, 
  NestModule,
  MiddlewareConsumer
} from '@nestjs/common';

import { AppController } from './api/hello-word/app.controller';
import { AppService } from './api/hello-word/app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './api/user/user.module';
import { CompanyModule } from './api/company/company.module';
import { SubscriptionCheckMiddleware } from './middleware/subscription-check.middleware';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  imports: [ 
    ConfigModule.forRoot({ 
      isGlobal: true ,
      envFilePath: '.env',
    }),

    DatabaseModule,
    UserModule,
    CompanyModule,  
  ],
    
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerMiddleware to all routes
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');

    // Apply SubscriptionCheckMiddleware to all routes except excluded ones
    consumer
      .apply(SubscriptionCheckMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}

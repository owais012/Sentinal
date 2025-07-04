import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from './utils/utils';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

require('dotenv').config();

async function Server() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*', 
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
    preflightContinue: false,
  });
  
  app.enableVersioning({
    type: VersioningType.URI,
    
  });
    // Global interceptor for response formatting
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('erp/client');

  const PORT = process.env.PORT ? +process.env.PORT : 8081;
  
  await app.listen(PORT);
  
  Logger.getInstance().logSuccess(`Server Running on Port ${PORT}`);
}

Server();
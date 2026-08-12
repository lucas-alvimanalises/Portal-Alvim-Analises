import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EmptyStringToUndefinedPipe } from './common/pipes/empty-string-to-undefined.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;

  // Atrás do proxy da Railway: sem isso, Express vê o IP do proxy pra toda
  // requisição, não o do cliente real — quebraria o rate limit por IP
  // (ThrottlerModule, ver app.module.ts), que passaria a valer pro tráfego
  // inteiro junto em vez de por pessoa.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({ origin: appConfig.corsOrigins, credentials: true });
  app.useGlobalPipes(
    new EmptyStringToUndefinedPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  await app.listen(appConfig.port);
  // eslint-disable-next-line no-console
  console.log(`Portal Alvim backend rodando em http://localhost:${appConfig.port}/api`);
}

bootstrap();

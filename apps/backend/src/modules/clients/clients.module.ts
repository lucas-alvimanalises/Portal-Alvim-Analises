import { Module } from '@nestjs/common';
import { ClientsController } from './infrastructure/clients.controller';
import { PrismaClientRepository } from './infrastructure/prisma-client.repository';
import { CLIENT_REPOSITORY } from './domain/client.repository';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case';
import { GetClientUseCase } from './application/use-cases/get-client.use-case';
import { GetMyClientUseCase } from './application/use-cases/get-my-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { DeactivateClientUseCase } from './application/use-cases/deactivate-client.use-case';

@Module({
  controllers: [ClientsController],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
    CreateClientUseCase,
    ListClientsUseCase,
    GetClientUseCase,
    GetMyClientUseCase,
    UpdateClientUseCase,
    DeactivateClientUseCase,
  ],
  exports: [CLIENT_REPOSITORY],
})
export class ClientsModule {}

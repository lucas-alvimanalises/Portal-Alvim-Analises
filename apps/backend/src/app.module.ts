import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAccessGuard } from './common/guards/jwt-access.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';
import { CompoundsModule } from './modules/compounds/compounds.module';
import { SamplingPointStandardsModule } from './modules/sampling-point-standards/sampling-point-standards.module';
import { SamplingPointsModule } from './modules/sampling-points/sampling-points.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { ServiceExecutionsModule } from './modules/service-executions/service-executions.module';
import { SamplesModule } from './modules/samples/samples.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { CustodyDocumentsModule } from './modules/custody-documents/custody-documents.module';
import { CustodyExtractionsModule } from './modules/custody-extractions/custody-extractions.module';
import { CertificateExtractionsModule } from './modules/certificate-extractions/certificate-extractions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CalendarNotesModule } from './modules/calendar-notes/calendar-notes.module';
import { LabelsModule } from './modules/labels/labels.module';
import { FieldChecklistsModule } from './modules/field-checklists/field-checklists.module';
import { PlantMaintenancesModule } from './modules/plant-maintenances/plant-maintenances.module';
import { FieldReportsModule } from './modules/field-reports/field-reports.module';
import { AnpMonthlyReportsModule } from './modules/anp-monthly-reports/anp-monthly-reports.module';
import { ServiceResultsSummaryModule } from './modules/service-results-summary/service-results-summary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Teto geral generoso (uso normal do portal, por IP) — as rotas
    // sensíveis a força bruta (login, esqueci/redefinir senha) têm um limite
    // bem mais estrito via @Throttle() direto no controller (ver
    // AuthController), sobrepondo este default.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ContractsModule,
    SchedulesModule,
    ServiceTypesModule,
    CompoundsModule,
    SamplingPointStandardsModule,
    SamplingPointsModule,
    AttachmentsModule,
    ServiceExecutionsModule,
    SamplesModule,
    CertificatesModule,
    CustodyDocumentsModule,
    CustodyExtractionsModule,
    CertificateExtractionsModule,
    NotificationsModule,
    DashboardModule,
    CalendarNotesModule,
    LabelsModule,
    FieldChecklistsModule,
    PlantMaintenancesModule,
    FieldReportsModule,
    AnpMonthlyReportsModule,
    ServiceResultsSummaryModule,
  ],
  providers: [
    // Guard global: exige JWT válido em toda rota, exceto as marcadas @Public().
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    // Guard global de rate limit (ver ThrottlerModule.forRoot acima).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

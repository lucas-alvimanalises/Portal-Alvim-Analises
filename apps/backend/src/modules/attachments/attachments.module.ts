import { Module } from '@nestjs/common';
import { FILE_STORAGE_SERVICE } from './domain/file-storage.interface';
import { LocalFileStorageService } from './infrastructure/local-file-storage.service';

// Sem controller público nesta fase: o storage é consumido internamente pelos
// módulos que vão anexar fotos/PDFs (service-executions, certificates) quando
// esses forem implementados na fase 2.
@Module({
  providers: [{ provide: FILE_STORAGE_SERVICE, useClass: LocalFileStorageService }],
  exports: [FILE_STORAGE_SERVICE],
})
export class AttachmentsModule {}

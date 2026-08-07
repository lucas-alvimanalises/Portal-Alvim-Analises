import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../domain/custody-document.repository';

@Injectable()
export class ListCustodyDocumentsUseCase {
  constructor(
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
  ) {}

  execute(compoundId?: string) {
    return this.custodyDocumentRepository.findMany(compoundId);
  }
}

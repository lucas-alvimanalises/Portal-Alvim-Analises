import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Converte strings vazias ("") para undefined nos bodies de requisição, antes
 * do ValidationPipe rodar. Necessário porque `@IsOptional()` do class-validator
 * só trata null/undefined como "ausente" — um campo opcional deixado em branco
 * num formulário HTML chega como "", que reprova validadores como @IsEmail().
 */
@Injectable()
export class EmptyStringToUndefinedPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' || typeof value !== 'object' || value === null) {
      return value;
    }
    return this.sanitize(value as Record<string, unknown>);
  }

  private sanitize(input: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      output[key] = val === '' ? undefined : val;
    }
    return output;
  }
}

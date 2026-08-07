import { IsString } from 'class-validator';

export class AddScopeDto {
  @IsString()
  serviceTypeId!: string;
}

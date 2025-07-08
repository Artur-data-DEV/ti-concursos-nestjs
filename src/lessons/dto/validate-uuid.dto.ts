import { IsUUID } from 'class-validator';

export class ValidateUuidDto {
  @IsUUID()
  teacherId!: string;

  @IsUUID()
  moduleId!: string;
}

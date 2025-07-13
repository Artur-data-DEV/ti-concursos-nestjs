import { IsCUIDv2 } from '../../../src/common/validators/is-cuid-validator';

export class ValidateCuidDto {
  @IsCUIDv2()
  teacherId!: string;

  @IsCUIDv2()
  moduleId!: string;
}

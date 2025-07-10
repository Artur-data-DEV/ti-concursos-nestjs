import { EnrollmentStatus } from '@prisma/client';
import { IsUUID, IsOptional, IsEnum } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}

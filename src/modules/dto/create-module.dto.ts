import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  title!: string;

  @IsString()
  courseId!: string;

  @IsInt()
  order!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

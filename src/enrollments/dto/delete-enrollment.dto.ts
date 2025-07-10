import { IsUUID } from 'class-validator';

export class DeleteEnrollmentDto {
  @IsUUID('4', { message: 'O ID do instrutor deve ser um UUID válido.' })
  id!: string;
}

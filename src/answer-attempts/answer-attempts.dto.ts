export class CreateAnswerAttemptDto {
  answerId: string;
  isCorrect: boolean;
  timeSpent?: number | null;
  attemptAt?: Date;
}

export class UpdateAnswerAttemptDto extends CreateAnswerAttemptDto {
  id: string;
}

export class CreateAnswerDto {
  userId: string;
  questionId: string;
  selectedOption?: string;
  textAnswer?: string | null;
  isCorrect?: boolean;
  timeSpentSeconds?: number;
}

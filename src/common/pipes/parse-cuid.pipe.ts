import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isCuid } from '@paralleldrive/cuid2';

@Injectable()
export class ParseCuidPipe implements PipeTransform {
  transform(value: string): string {
    if (!isCuid(value)) {
      throw new BadRequestException('Validation failed (CUID is expected)');
    }
    return value;
  }
}

import { UserRole } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: UserRole;
  };
}

// Versão mock: apenas `user.sub` e `user.role`
export interface AuthenticatedRequestMock {
  user: {
    sub: string;
    role: UserRole;
  };
}

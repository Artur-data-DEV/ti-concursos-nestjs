import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { UserRole } from '@prisma/client';

function createMockRequest(role: UserRole): AuthenticatedRequest {
  return {
    user: {
      sub: randomUUID(),
      role,
    },
  } as AuthenticatedRequest;
}

export const adminReq = createMockRequest(UserRole.ADMIN);
export const studentReq = createMockRequest(UserRole.STUDENT);
export const professorReq = createMockRequest(UserRole.TEACHER);

export const adminId = adminReq.user.sub;
export const studentId = studentReq.user.sub;
export const professorId = professorReq.user.sub;



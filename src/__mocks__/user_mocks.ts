import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { UserRole } from '@prisma/client'; // Certifique-se de que você está importando a enum correta
import { createId } from '@paralleldrive/cuid2';

function createMockRequest(role: UserRole): AuthenticatedRequest {
  return {
    user: {
      sub: createId(),
      role,
    },
  } as AuthenticatedRequest;
}

export const adminReq = createMockRequest(UserRole.ADMIN);
export const studentReq = createMockRequest(UserRole.STUDENT);
export const professorReq = createMockRequest(UserRole.TEACHER);

// Também exporta os IDs separados, se necessário em testes
export const adminId = adminReq.user.sub;
export const studentId = studentReq.user.sub;
export const professorId = professorReq.user.sub;

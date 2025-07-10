import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export async function getTokenForUser(prisma: PrismaService, role: UserRole) {
  const user = await prisma.user.upsert({
    where: { email: `${role.toLowerCase()}@example.com` },
    update: {},
    create: {
      email: `${role.toLowerCase()}@example.com`,
      name: `${role} User`,
      role,
    },
  });

  const jwtService = new JwtService({ secret: process.env.JWT_SECRET });
  const token = jwtService.sign({ sub: user.id, role: user.role });

  return { token, user };
}

export interface UserJwtPayload {
  sub: string;
  role: 'ADMIN' | 'STUDENT';
}

import bcrypt from 'bcryptjs';

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD!;

export async function verifyPassword(password: string): Promise<boolean> {
  if (DASHBOARD_PASSWORD.startsWith('$2')) {
    return bcrypt.compare(password, DASHBOARD_PASSWORD);
  }
  return password === DASHBOARD_PASSWORD;
}

export function generateToken(): string {
  return Buffer.from(`${Date.now()}-${Math.random().toString(36)}`).toString('base64');
}

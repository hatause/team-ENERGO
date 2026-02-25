import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

const BCRYPT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_ROUNDS);

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const generateOpaqueToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');

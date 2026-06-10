import bcrypt from 'bcryptjs';
import { config$ } from '../../config';

export const passwordService = {
  hash: async (password: string): Promise<string> => {
    return bcrypt.hash(password, config$.BCRYPT_COST);
  },

  verify: async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
  },
};

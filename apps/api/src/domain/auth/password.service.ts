import bcrypt from 'bcryptjs';

/** Bcrypt-обёртка с cost-фактором из конфига (prod ≥ 12 — рекомендация OWASP). */
export class PasswordService {
  constructor(private readonly cost: number) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

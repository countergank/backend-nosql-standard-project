import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

@Injectable()
export class EncodeService {
  private SALT_ROUNDS = 10;

  hash(value: string): string {
    const salt = bcrypt.genSaltSync(this.SALT_ROUNDS);
    const hashedValue = bcrypt.hashSync(value, salt);
    return hashedValue;
  }

  compare(value: string, hash: string): boolean {
    return bcrypt.compareSync(value, hash);
  }
}

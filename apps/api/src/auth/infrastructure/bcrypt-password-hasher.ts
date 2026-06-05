import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { PasswordHasher } from "@/auth/application/password-hasher";

/** bcrypt implementation of the PasswordHasher port. */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
	compare(plain: string, hash: string): Promise<boolean> {
		return bcrypt.compare(plain, hash);
	}
}

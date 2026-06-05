/** DI token for the PasswordHasher port. */
export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

/** Hashes and verifies passwords. Keeps bcrypt out of the application service. */
export interface PasswordHasher {
	compare(plain: string, hash: string): Promise<boolean>;
}

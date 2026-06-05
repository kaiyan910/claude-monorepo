export interface UserProps {
	id: string;
	name: string;
	username: string;
	/** bcrypt hash — never exposed in a profile. */
	password: string;
	email: string;
	isRoot: boolean;
	enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/** Public-safe view of a user (no password). */
export type UserProfile = Omit<UserProps, "password">;

/**
 * User domain object. Guards which fields leave the domain — the password hash
 * is only reachable through `passwordHash` (for credential checks) and is
 * stripped by `toProfile()` so it can never reach a presenter/response.
 */
export class User {
	constructor(private readonly props: UserProps) {}

	get id(): string {
		return this.props.id;
	}

	get username(): string {
		return this.props.username;
	}

	get passwordHash(): string {
		return this.props.password;
	}

	get isRoot(): boolean {
		return this.props.isRoot;
	}

	get enabled(): boolean {
		return this.props.enabled;
	}

	toProfile(): UserProfile {
		const { password: _password, ...profile } = this.props;
		return profile;
	}

	/**
	 * Ensures accidental serialization (e.g. by a logger or interceptor) never
	 * leaks the password hash — JSON.stringify(user) emits the safe profile.
	 */
	toJSON(): UserProfile {
		return this.toProfile();
	}
}

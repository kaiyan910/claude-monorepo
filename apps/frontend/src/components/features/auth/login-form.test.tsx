import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/features/auth/login-form";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const mutate = vi.fn();
const useLoginMock = vi.fn();
vi.mock("@/hooks/use-login", () => ({
	useLogin: () => useLoginMock(),
}));

function setLoginState(
	overrides: Partial<{ isPending: boolean; isError: boolean; error: unknown }>,
) {
	useLoginMock.mockReturnValue({
		mutate,
		isPending: false,
		isError: false,
		error: null,
		...overrides,
	});
}

afterEach(() => {
	mutate.mockReset();
	useLoginMock.mockReset();
});

describe("LoginForm", () => {
	it("shows validation errors when submitting empty fields", async () => {
		setLoginState({});
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.click(screen.getByRole("button", { name: "login.submit" }));

		expect(
			await screen.findByText("errors.usernameRequired"),
		).toBeInTheDocument();
		expect(screen.getByText("errors.passwordRequired")).toBeInTheDocument();
		const usernameInput = screen.getByLabelText("login.usernameLabel");
		expect(usernameInput).toHaveAttribute("aria-invalid", "true");
		expect(usernameInput).toHaveAttribute("aria-describedby", "username-error");
		expect(document.getElementById("username-error")).toHaveTextContent(
			"errors.usernameRequired",
		);
		expect(mutate).not.toHaveBeenCalled();
	});

	it("submits the credentials when valid", async () => {
		setLoginState({});
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText("login.usernameLabel"), "root");
		await user.type(screen.getByLabelText("login.passwordLabel"), "pw");
		await user.click(screen.getByRole("button", { name: "login.submit" }));

		await waitFor(() =>
			expect(mutate).toHaveBeenCalledWith({ username: "root", password: "pw" }),
		);
	});

	it("toggles password visibility", async () => {
		setLoginState({});
		const user = userEvent.setup();
		render(<LoginForm />);

		const password = screen.getByLabelText("login.passwordLabel");
		expect(password).toHaveAttribute("type", "password");

		await user.click(
			screen.getByRole("button", { name: "login.showPassword" }),
		);
		expect(password).toHaveAttribute("type", "text");
	});

	it("disables the submit button while pending", () => {
		setLoginState({ isPending: true });
		render(<LoginForm />);

		expect(
			screen.getByRole("button", { name: "login.submitting" }),
		).toBeDisabled();
	});

	it("focuses the first invalid field on submit with errors", async () => {
		setLoginState({});
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.click(screen.getByRole("button", { name: "login.submit" }));

		await waitFor(() =>
			expect(screen.getByLabelText("login.usernameLabel")).toHaveFocus(),
		);
	});

	it("renders a mapped server error", () => {
		setLoginState({
			isError: true,
			error: {
				isAxiosError: true,
				response: {
					data: {
						httpCode: 401,
						code: "AUTH_INVALID_CREDENTIALS",
						message: "Invalid credentials",
						traceId: "t-1",
						createdAt: "2026-06-06T00:00:00.000Z",
					},
				},
			},
		});
		render(<LoginForm />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"errors.invalidCredentials",
		);
	});
});

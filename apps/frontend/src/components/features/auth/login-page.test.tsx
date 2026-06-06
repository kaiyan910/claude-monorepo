import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "@/components/features/auth/login-page";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/features/auth/login-form", () => ({
	LoginForm: () => <div data-testid="login-form" />,
}));

describe("LoginPage", () => {
	it("renders the brand, title, and the login form", () => {
		render(<LoginPage />);

		expect(
			screen.getByRole("heading", { name: "login.title" }),
		).toBeInTheDocument();
		expect(screen.getByText("login.brandTagline")).toBeInTheDocument();
		expect(screen.getByText("login.subtitle")).toBeInTheDocument();
		expect(screen.getByTestId("login-form")).toBeInTheDocument();
	});
});

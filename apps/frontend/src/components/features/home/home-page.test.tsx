import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "@/components/features/home/home-page";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, opts?: { name?: string }) =>
			opts?.name ? `${key}:${opts.name}` : key,
	}),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

const clear = vi.fn();
vi.mock("@/store/auth.store", () => ({
	useAuthStore: (selector: (s: { clear: () => void }) => unknown) =>
		selector({ clear }),
}));

const useMeMock = vi.fn();
vi.mock("@/hooks/use-me", () => ({
	useMe: () => useMeMock(),
}));

afterEach(() => {
	navigate.mockReset();
	clear.mockReset();
	useMeMock.mockReset();
});

describe("HomePage", () => {
	it("greets the authenticated user by name", () => {
		useMeMock.mockReturnValue({ data: { name: "Root" }, isLoading: false });
		render(<HomePage />);

		expect(screen.getByText("home.greeting:Root")).toBeInTheDocument();
	});

	it("logs out: clears the store and navigates to /login", async () => {
		useMeMock.mockReturnValue({ data: { name: "Root" }, isLoading: false });
		const user = userEvent.setup();
		render(<HomePage />);

		await user.click(screen.getByRole("button", { name: "home.logout" }));

		expect(clear).toHaveBeenCalledTimes(1);
		expect(navigate).toHaveBeenCalledWith({ to: "/login" });
	});
});

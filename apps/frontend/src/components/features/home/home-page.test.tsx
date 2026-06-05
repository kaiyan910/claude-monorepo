import { render, screen } from "@testing-library/react";
import { HomePage } from "@/components/features/home/home-page";

describe("HomePage", () => {
	it("renders the application heading", () => {
		render(<HomePage />);

		expect(
			screen.getByRole("heading", { name: /claude-monorepo/i }),
		).toBeInTheDocument();
	});
});

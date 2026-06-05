import { cn } from "@/lib/utils";

describe("cn", () => {
	it("joins multiple class names", () => {
		expect(cn("p-2", "text-sm")).toBe("p-2 text-sm");
	});

	it("resolves conflicting tailwind utilities, keeping the last", () => {
		expect(cn("p-2", "p-4")).toBe("p-4");
	});

	it("drops falsy values", () => {
		expect(cn("p-2", false, undefined, "text-sm")).toBe("p-2 text-sm");
	});
});

import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** shadcn-style label. Plain <label>; pair with input `id` via `htmlFor`. */
export function Label({
	className,
	...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label
			className={cn(
				"text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
				className,
			)}
			{...props}
		/>
	);
}

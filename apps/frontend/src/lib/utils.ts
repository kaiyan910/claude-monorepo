import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve conflicting Tailwind utilities,
 * keeping the last one. Standard shadcn/ui helper used across components.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Home page — placeholder landing screen confirming the scaffold renders.
 * Lives outside the route file so the route stays code-splittable.
 */
export function HomePage() {
	return (
		<main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="font-bold text-4xl tracking-tight">claude-monorepo</h1>
			<p className="text-muted-foreground">
				Frontend foundation is ready. Build features under{" "}
				<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
					src/components/features
				</code>
				.
			</p>
		</main>
	);
}

// Next.js convention — rendered automatically for unmatched routes (/404)
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold">404 — Page Not Found</h1>
        <p className="mt-2 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      </section>
    </main>
  );
}

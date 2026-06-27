import { PublicSearchShell } from "@/components/public-search-shell";

export default function PublicProfilePage() {
  return (
    <PublicSearchShell>
      <main className="flex min-h-screen items-center justify-center px-6 text-foreground">
        <section className="w-full max-w-4xl">
          <h1 className="text-3xl font-semibold">User Profile</h1>
        </section>
      </main>
    </PublicSearchShell>
  );
}

import { PublicSearchResults } from "@/components/public-search-results";
import { PublicSearchShell } from "@/components/public-search-shell";

export default function PublicUsersPage() {
  return (
    <PublicSearchShell>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <section className="mx-auto flex max-w-7xl flex-col gap-8">
          <div className="border-b border-border pb-6">
            <p className="text-sm font-semibold text-primary">Users</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">
              Public users
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search active public accounts and discover shared study materials.
            </p>
          </div>

          <PublicSearchResults />
        </section>
      </main>
    </PublicSearchShell>
  );
}

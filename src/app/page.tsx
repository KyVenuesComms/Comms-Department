export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-400">
          Creative team
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Work Order Status
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          A live, glanceable view of every creative request and where it stands.
          The board is being built — check back soon.
        </p>
        <p className="mt-8 text-sm text-zinc-400 dark:text-zinc-500">
          Phase 1 · project setup
        </p>
      </main>
    </div>
  );
}

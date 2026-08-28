import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-xl text-center">
        <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          AI Workplace Communication Simulator
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Authentication foundation
        </h1>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <Link href="/app">Open authenticated app</Link>
            <UserButton />
          </Show>
        </div>
      </section>
    </main>
  );
}

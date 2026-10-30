import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — AI Audience Profiler" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-5">
      <p className="text-sm font-medium text-ink-mute">AI Audience Profiler</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Presenter sign in</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Only accounts listed as administrators can open the dashboard.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

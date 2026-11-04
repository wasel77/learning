import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="login-shell grid min-h-screen place-items-center px-4 py-16">
      <div className="w-full max-w-md">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}

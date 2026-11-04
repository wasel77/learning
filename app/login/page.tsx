import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#020617] px-4">
      <AuthForm mode="login" />
    </main>
  );
}

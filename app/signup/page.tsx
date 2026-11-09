import { AuthForm } from "@/components/AuthForm";
import { requireAdmin } from "@/lib/data";

export default async function SignupPage() {
  await requireAdmin();

  return (
    <main className="grid min-h-screen place-items-center bg-[#020617] px-4">
      <AuthForm mode="signup" />
    </main>
  );
}

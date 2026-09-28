import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="page">
      <h1>Cuadra</h1>
      <LoginForm errorEnlace={error === "enlace"} />
    </main>
  );
}

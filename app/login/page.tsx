import { CabeceraLibreta } from "../CabeceraLibreta";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="page">
      <CabeceraLibreta>
        <h1 className="marca">Cuadra</h1>
        <p className="subtitulo">Tus gastos del mes, apuntados y claros.</p>
      </CabeceraLibreta>
      <LoginForm errorEnlace={error === "enlace"} />
    </main>
  );
}

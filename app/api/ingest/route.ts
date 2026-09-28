import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeIngestBody } from "@/lib/ingest-input";
import { guardarMovimiento } from "@/lib/ingest";

export async function POST(request: NextRequest) {
  if (!tokenValido(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "El cuerpo no es JSON válido" }, { status: 400 });
  }

  const entrada = normalizeIngestBody(body);
  if (!entrada.ok) return NextResponse.json({ ok: false, error: entrada.error }, { status: 400 });

  try {
    const r = await guardarMovimiento(entrada.data);
    if (r.duplicate) return NextResponse.json({ ok: true, duplicate: true, id: r.id }, { status: 200 });
    return NextResponse.json(
      {
        ok: true,
        id: r.id,
        importe: entrada.data.importe,
        comercio: entrada.data.comercio,
        revisado: entrada.data.revisado,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[ingest]", e);
    return NextResponse.json({ ok: false, error: "Error interno al guardar" }, { status: 500 });
  }
}

/** Compara "Bearer <token>" con INGEST_TOKEN en tiempo constante. Sin INGEST_TOKEN configurado, rechaza todo. */
function tokenValido(header: string | null): boolean {
  const esperado = process.env.INGEST_TOKEN;
  if (!esperado || !header?.startsWith("Bearer ")) return false;
  const recibido = header.slice("Bearer ".length).trim();
  const a = createHash("sha256").update(recibido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

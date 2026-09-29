"use client";

import { cerrarSesion } from "@/app/actions";

export function CerrarSesion() {
  return (
    <form
      action={cerrarSesion}
      className="cerrar-sesion"
      onSubmit={(e) => {
        if (!confirm("¿Cerrar la sesión en este dispositivo? Tendrás que volver a pedir el código para entrar.")) {
          e.preventDefault();
        }
      }}
    >
      <button>Cerrar sesión</button>
    </form>
  );
}

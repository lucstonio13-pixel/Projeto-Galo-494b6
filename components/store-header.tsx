"use client";

import { Flame, LogOut, UserRound } from "lucide-react";
import { api, useViewer } from "@/lib/client";

export function StoreHeader() {
  const { user } = useViewer();
  return (
    <header className="customer-header">
      <a className="customer-logo" href="/">
        <span>RC</span>
        <b>GALETERIA RC</b>
      </a>
      <nav>
        <a href="/">Cardápio</a>
        <a href="/pedidos">Meus pedidos</a>
        {user && user.role !== "customer" && <a href="/operacao">Operação</a>}
      </nav>
      {user ? (
        <button
          className="customer-account"
          onClick={async () => {
            await api("/api/auth/sign-out", {});
            location.href = "/";
          }}
        >
          <LogOut /> <span>Sair</span>
        </button>
      ) : (
        <a className="customer-account" href="/entrar">
          <UserRound /> <span>Entrar</span>
        </a>
      )}
    </header>
  );
}

export function StoreFooter() {
  return (
    <footer className="customer-footer">
      <a href="/"><Flame /> GALETERIA RC</a>
      <span>Sabor direto da brasa.</span>
      <a href="/operacao">Área da equipe →</a>
    </footer>
  );
}

"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { api, useViewer } from "@/lib/client";
import { BUSINESS } from "@/lib/business";

export function StoreHeader() {
  const { user } = useViewer();
  return (
    <header className="customer-header">
      <Link className="customer-logo" href="/" prefetch>
        <img className="brand-logo brand-logo-dark customer-logo-image" src="/logo-galeteria-rc.png" alt="Galeteria RC" />
      </Link>
      <nav>
        <Link href="/" prefetch>Cardápio</Link>
        <Link href="/pedidos" prefetch>Meus pedidos</Link>
        {user && user.role !== "customer" && <Link href="/operacao" prefetch>Operação</Link>}
      </nav>
      {user ? (
        <button
          type="button"
          className="customer-account"
          onClick={async () => {
            await api("/api/auth/sign-out", {});
            location.href = "/";
          }}
        >
          <LogOut /> <span>Sair</span>
        </button>
      ) : (
        <Link className="customer-account" href="/entrar" prefetch>
          <UserRound /> <span>Entrar</span>
        </Link>
      )}
    </header>
  );
}

export function StoreFooter() {
  return (
    <footer className="customer-footer">
      <Link href="/" prefetch>
        <img className="brand-logo brand-logo-dark customer-footer-logo" src="/logo-galeteria-rc.png" alt="Galeteria RC" loading="lazy" decoding="async" />
      </Link>
      <span>Sabor direto da brasa. · CNPJ {BUSINESS.cnpj}</span>
      <nav className="customer-footer-links" aria-label="Informações e acesso">
        <Link href="/privacidade" prefetch>Privacidade</Link>
        <Link href="/termos" prefetch>Termos</Link>
        <Link href="/operacao" prefetch>Área da equipe →</Link>
      </nav>
    </footer>
  );
}

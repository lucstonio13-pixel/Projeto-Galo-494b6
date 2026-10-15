import type { Metadata } from "next";
import Link from "next/link";
import { StoreFooter, StoreHeader } from "@/components/store-header";
import { LEGAL_VERSION } from "@/lib/legal";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = {
  title: "Termos de Uso | Galeteria RC",
  description: "Regras para pedidos online da Galeteria RC.",
};

export default function Page() {
  return (
    <>
      <StoreHeader />
      <main className="content-page legal-page">
        <Link className="back-link" href="/">← Voltar à loja</Link>
        <span className="eyebrow">PEDIDOS ONLINE</span>
        <h1>Termos de Uso</h1>
        <p className="legal-updated">Versão {LEGAL_VERSION.split("-").reverse().join("/")}</p>
        <section className="panel legal-content">
          <h2>Responsável pelo serviço</h2>
          <p>O serviço de pedidos da <strong>{BUSINESS.tradeName}</strong> é operado por {BUSINESS.legalName}, CNPJ {BUSINESS.cnpj}.</p>
          <h2>Funcionamento do serviço</h2>
          <p>O site permite consultar o cardápio, montar e enviar pedidos quando a loja estiver recebendo pedidos. Produtos, preços, horários, modalidades, áreas atendidas e prazos podem mudar; o resumo exibido imediatamente antes do envio é o que vale para aquela tentativa.</p>
          <h2>Conta e informações do pedido</h2>
          <p>Você deve informar dados verdadeiros e manter sua senha protegida. Confira telefone, endereço, itens, observações, forma de atendimento e valor total antes de confirmar.</p>
          <h2>Confirmação e disponibilidade</h2>
          <p>O envio registra o pedido na fila da loja, sujeito à disponibilidade real e às etapas mostradas no acompanhamento. Se houver indisponibilidade excepcional, a equipe poderá entrar em contato e cancelar o pedido com o motivo registrado.</p>
          <h2>Pagamento</h2>
          <p>O site não cobra online. O pagamento é realizado fora do sistema, na entrega ou retirada, conforme a forma escolhida. Qualquer devolução de dinheiro também ocorre fora do site antes de seu registro administrativo.</p>
          <h2>Cancelamento</h2>
          <p>A política específica da loja é exibida no checkout. Solicitações devem ser feitas pelo canal de atendimento da página inicial e podem depender da etapa de preparo. Cancelamentos realizados pela equipe ficam registrados no histórico do pedido.</p>
          <h2>Uso adequado</h2>
          <p>Não use o serviço para pedidos falsos, tentativas de fraude, acesso não autorizado ou interferência no funcionamento do site. A loja pode limitar ou suspender acessos usados de forma abusiva.</p>
          <h2>Privacidade e contato</h2>
          <p>O tratamento de dados está explicado no <Link href="/privacidade">Aviso de Privacidade</Link>. Dúvidas sobre pedidos, dados ou estes termos devem ser encaminhadas ao contato informado na página inicial.</p>
        </section>
      </main>
      <StoreFooter />
    </>
  );
}

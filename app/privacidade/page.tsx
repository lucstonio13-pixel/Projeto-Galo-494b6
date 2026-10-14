import type { Metadata } from "next";
import Link from "next/link";
import { StoreFooter, StoreHeader } from "@/components/store-header";
import { LEGAL_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Aviso de Privacidade | Galeteria RC",
  description: "Como a Galeteria RC utiliza e protege os dados necessários para pedidos online.",
};

export default function Page() {
  return (
    <>
      <StoreHeader />
      <main className="content-page legal-page">
        <Link className="back-link" href="/">← Voltar à loja</Link>
        <span className="eyebrow">TRANSPARÊNCIA</span>
        <h1>Aviso de Privacidade</h1>
        <p className="legal-updated">Versão {LEGAL_VERSION.split("-").reverse().join("/")}</p>
        <section className="panel legal-content">
          <h2>Quais dados utilizamos</h2>
          <p>Para criar a conta, receber e acompanhar pedidos, podemos tratar nome, e-mail ou telefone, dados de sessão e senha protegida. Em pedidos de entrega também utilizamos endereço e região. O pedido guarda itens, valores, observações, forma de pagamento informada e seu histórico de atendimento.</p>
          <h2>Para que os dados são usados</h2>
          <p>Usamos essas informações para autenticar sua conta, preparar e entregar ou disponibilizar o pedido, entrar em contato sobre o atendimento, evitar duplicidade e fraude, manter registros operacionais e cumprir obrigações aplicáveis ao estabelecimento.</p>
          <h2>Pagamento e dados financeiros</h2>
          <p>O site não processa cartão, não gera Pix e não recebe dinheiro. O pagamento acontece fora do site, na entrega ou retirada. A equipe registra apenas a confirmação operacional e os lançamentos internos necessários.</p>
          <h2>Fornecedores e segurança</h2>
          <p>Os dados ficam na infraestrutura de hospedagem utilizada pela loja e podem passar pelo provedor de e-mail transacional quando houver recuperação de senha ou convite de equipe. O acesso operacional é restrito por perfil, e ações administrativas relevantes são registradas.</p>
          <h2>Conservação e seus pedidos</h2>
          <p>As informações são mantidas pelo período necessário ao atendimento, à segurança, à prestação de contas e às obrigações aplicáveis. Para solicitar acesso, correção ou exclusão quando cabível, use o canal de atendimento exibido na página inicial da loja.</p>
          <h2>Atualizações</h2>
          <p>Este aviso pode ser atualizado quando o serviço ou os fornecedores mudarem. A versão aplicável a cada novo pedido fica registrada junto ao pedido.</p>
        </section>
      </main>
      <StoreFooter />
    </>
  );
}

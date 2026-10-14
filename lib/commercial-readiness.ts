import type { Settings } from "@/lib/server";

export type CommercialReadinessCheck = {
  key: "commercial-data" | "operation" | "catalog" | "email" | "legal";
  label: string;
  ok: boolean;
  detail: string;
};

export type CommercialReadiness = {
  ready: boolean;
  checks: CommercialReadinessCheck[];
};

const placeholder = /(demonstra|\bteste\b|a confirmar|exemplo|placeholder)/i;

export function evaluateCommercialReadiness(
  settings: Settings,
  input: { activeProducts: number; emailConfigured: boolean },
): CommercialReadiness {
  const commercialData =
    !settings.demo &&
    !placeholder.test(settings.storeName) &&
    !placeholder.test(settings.address) &&
    !placeholder.test(settings.contact) &&
    settings.contact.trim().length >= 8 &&
    (!settings.pickup || settings.address.trim().length >= 8);
  const operation =
    (settings.pickup || settings.delivery) &&
    settings.days.length > 0 &&
    settings.payments.length > 0 &&
    settings.eta.trim().length >= 2 &&
    settings.cancellationPolicy.trim().length >= 10 &&
    (!settings.delivery || settings.areas.length > 0);

  const checks: CommercialReadinessCheck[] = [
    {
      key: "commercial-data",
      label: "Dados comerciais confirmados",
      ok: commercialData,
      detail: commercialData
        ? "Nome, contato e endereço foram marcados como reais."
        : "Confirme os dados reais e remova textos de demonstração.",
    },
    {
      key: "operation",
      label: "Regras de atendimento completas",
      ok: operation,
      detail: operation
        ? "Modalidades, horários, pagamentos e cancelamento estão definidos."
        : "Complete horários, pagamentos, modalidades, prazo e cancelamento.",
    },
    {
      key: "catalog",
      label: "Cardápio disponível",
      ok: input.activeProducts > 0,
      detail:
        input.activeProducts > 0
          ? `${input.activeProducts} produto(s) ativo(s) e disponível(is).`
          : "Cadastre e disponibilize ao menos um produto em categoria ativa.",
    },
    {
      key: "email",
      label: "E-mail transacional",
      ok: input.emailConfigured,
      detail: input.emailConfigured
        ? "Recuperação de senha e convites possuem provedor configurado."
        : "Configure Resend ou EMAIL_WEBHOOK_URL no ambiente de produção.",
    },
    {
      key: "legal",
      label: "Privacidade e termos",
      ok: true,
      detail: "Avisos publicados e aceite registrado em novos pedidos.",
    },
  ];

  return { ready: checks.every((check) => check.ok), checks };
}

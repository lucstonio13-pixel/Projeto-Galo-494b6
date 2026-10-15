import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const settingsSchema = z
  .object({
    demo: z.boolean(),
    open: z.boolean(),
    pickup: z.boolean(),
    delivery: z.boolean(),
    fee: z.number().int().min(0).max(50000),
    areas: z.array(z.string().trim().min(2).max(100)).max(250),
    areaFees: z.record(z.string(), z.number().int().min(0).max(50000)),
    payments: z.array(z.string().trim().min(2).max(50)).min(1).max(10),
    storeName: z.string().trim().min(2).max(100),
    address: z.string().trim().max(300),
    contact: z.string().trim().min(8).max(100),
    timezone: z.string().trim().min(3).max(100).refine((value) => {
      try {
        new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    }, "Fuso horário inválido."),
    start: time,
    end: time,
    days: z.array(z.number().int().min(0).max(6)).min(1),
    eta: z.string().trim().min(2).max(100),
    cancellationPolicy: z.string().trim().min(10).max(1000),
  })
  .superRefine((settings, context) => {
    if (!settings.pickup && !settings.delivery) {
      context.addIssue({ code: "custom", path: ["pickup"], message: "Habilite retirada ou entrega." });
    }
    if (settings.pickup && settings.address.length < 8) {
      context.addIssue({ code: "custom", path: ["address"], message: "Informe o endereço de retirada." });
    }
    if (settings.delivery && settings.areas.length === 0) {
      context.addIssue({ code: "custom", path: ["areas"], message: "Informe as regiões atendidas." });
    }
    if (new Set(settings.areas.map((area) => area.toLocaleLowerCase("pt-BR"))).size !== settings.areas.length) {
      context.addIssue({ code: "custom", path: ["areas"], message: "Não repita bairros ou regiões." });
    }
    if (settings.delivery && settings.areas.some((area) => settings.areaFees[area] === undefined)) {
      context.addIssue({ code: "custom", path: ["areaFees"], message: "Informe a taxa de cada bairro ou região." });
    }
    if (settings.start === settings.end) {
      context.addIssue({ code: "custom", path: ["end"], message: "Início e fim não podem ser iguais." });
    }
  });

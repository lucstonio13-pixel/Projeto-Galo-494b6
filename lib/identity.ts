export const PHONE_ACCOUNT_DOMAIN = "clientes.galeteria.local";

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
}

export function isValidPhone(value: string) {
  return /^\d{10,11}$/.test(normalizePhone(value));
}

export function phoneAccountEmail(phone: string) {
  return `telefone-${normalizePhone(phone)}@${PHONE_ACCOUNT_DOMAIN}`;
}

export function isPhoneAccountEmail(email: string) {
  return email.toLowerCase().endsWith(`@${PHONE_ACCOUNT_DOMAIN}`);
}

export function formatPhone(value: string) {
  const phone = normalizePhone(value);
  if (phone.length !== 10 && phone.length !== 11) return value;
  const part = phone.length === 11 ? [phone.slice(0, 2), phone.slice(2, 7), phone.slice(7)] : [phone.slice(0, 2), phone.slice(2, 6), phone.slice(6)];
  return `(${part[0]}) ${part[1]}-${part[2]}`;
}

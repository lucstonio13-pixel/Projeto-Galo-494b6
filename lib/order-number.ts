export function orderNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(number) && number > 0 && number <= 9999 ? String(number).padStart(4, '0') : '----';
}

export function isOrderNumber(value: string) {
  return /^\d{4}$/.test(value) && Number(value) > 0;
}

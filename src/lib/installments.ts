import { addMonths, format, isValid, parseISO } from "date-fns";

export interface Installment { number: number; amount: number; due_date: string }

export function buildInstallments(total: number, count: number, firstDue: string): Installment[] {
  const cents = Math.round((total + Number.EPSILON) * 100);
  if (!Number.isFinite(total) || !Number.isSafeInteger(cents) || cents <= 0)
    throw new Error("Informe um valor maior que zero.");
  if (!Number.isInteger(count) || count < 1 || count > 120)
    throw new Error("Informe de 1 a 120 parcelas.");
  if (cents < count) throw new Error("O valor não permite parcelas de pelo menos R$ 0,01.");
  const date = parseISO(firstDue);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDue) || !isValid(date))
    throw new Error("Informe uma data de vencimento válida.");
  const base = Math.floor(cents / count);
  const remainder = cents % count;
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    amount: (base + (index < remainder ? 1 : 0)) / 100,
    // Always use the original day: Jan 31 -> Feb 28 -> Mar 31.
    due_date: format(addMonths(date, index), "yyyy-MM-dd"),
  }));
}

export function previewInstallments(total: number, count: number, firstDue: string) {
  try { return { installments: buildInstallments(total, count, firstDue), error: null }; }
  catch (error) { return { installments: [], error: (error as Error).message }; }
}

import { z } from 'zod';

export const billingDescriptionInput = z.string().trim().min(1, 'Informe a descrição da cobrança.').max(120, 'Use até 120 caracteres na descrição.');

export const billingAmountInput = z.string().trim()
  .regex(/^(?:\d{1,4}(?:[,.]\d{1,2})?|\d\.\d{3},\d{2})$/, 'Informe um valor como 395,00.')
  .transform(value => Math.round(Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value) * 100))
  .refine(value => value >= 1000 && value <= 600000, 'Informe um valor entre R$ 10,00 e R$ 6.000,00.');

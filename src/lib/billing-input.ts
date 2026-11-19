import { z } from 'zod';

export const billingAmountInput = z.string().trim()
  .regex(/^\d{1,4}(?:[,.]\d{1,2})?$/, 'Informe um valor como 395,00.')
  .transform(value => Math.round(Number(value.replace(',', '.')) * 100))
  .refine(value => value >= 1000 && value <= 600000, 'Informe um valor entre R$ 10,00 e R$ 6.000,00.');

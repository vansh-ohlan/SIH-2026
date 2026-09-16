import { z } from 'zod';

export const devTokenSchema = z.object({
  role: z.enum(['citizen', 'revenue_officer', 'registrar', 'admin'], {
    errorMap: () => ({
      message: 'Role must be one of: citizen, revenue_officer, registrar, admin'
    })
  }),
  userId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  officerId: z.string().min(1).optional()
});

export type DevTokenSchema = z.infer<typeof devTokenSchema>;

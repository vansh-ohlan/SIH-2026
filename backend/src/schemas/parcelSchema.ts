import { z } from 'zod';

export const parcelParamSchema = z.object({
  ulpid: z.string().min(1, 'ULPID is required')
});

export const parcelSearchQuerySchema = z.object({
  q: z.string().optional().default('')
});

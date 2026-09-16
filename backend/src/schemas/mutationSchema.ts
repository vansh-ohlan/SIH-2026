import { z } from 'zod';

export const mutationSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'needs_review'], {
    errorMap: () => ({ message: 'Decision must be one of: approved, rejected, needs_review' })
  }),
  officer_id: z.string().min(1, 'officer_id is required'),
  notes: z.string().min(1, 'notes are required')
});

export type MutationInput = z.infer<typeof mutationSchema>;

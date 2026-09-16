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

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(1, 'Full name cannot be empty')
    .max(100, 'Full name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  // Public self-registration is strictly for citizens. Role cannot be set by client.
  role: z.string().optional()
});

export type RegisterSchema = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    username: z.string().trim().min(1).optional(),
    email: z.string().trim().min(1).optional(),
    identifier: z.string().trim().min(1).optional(),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required')
  })
  .refine(
    (data) => !!(data.username || data.email || data.identifier),
    {
      message: 'Username, email, or identifier is required',
      path: ['identifier']
    }
  );

export type LoginSchema = z.infer<typeof loginSchema>;

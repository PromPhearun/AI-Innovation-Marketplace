import { z } from 'zod';

export const ideaSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim(),
  department: z.string().min(1, 'Department is required').trim(),
  category: z.string().min(1, 'Category is required').trim(),
  expectedBenefits: z
    .string()
    .max(1000, 'Expected benefits cannot exceed 1000 characters')
    .optional()
    .or(z.literal('')),
});

export const commentSchema = z.object({
  ideaId: z.string().min(1, 'Idea ID is required'),
  comment: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters')
    .trim(),
});

export const voteSchema = z.object({
  ideaId: z.string().min(1, 'Idea ID is required'),
  vote: z.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
});

export const userAuthSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  role: z.enum(['employee', 'manager', 'admin']),
  department: z.string().min(1, 'Department is required').trim(),
});

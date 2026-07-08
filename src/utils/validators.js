import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }
  req.body = result.data; // set validated data on req.body
  next();
};

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional().nullable(),
  assigned_to: z.string().uuid('Invalid developer UUID format'),
  priority: z.number().int().min(1, 'Priority must be between 1 and 3').max(3, 'Priority must be between 1 and 3').optional().default(3)
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title is too long').optional(),
  description: z.string().max(5000, 'Description is too long').optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.number().int().min(1, 'Priority must be between 1 and 3').max(3, 'Priority must be between 1 and 3').optional(),
  assigned_to: z.string().uuid('Invalid developer UUID format').optional()
});

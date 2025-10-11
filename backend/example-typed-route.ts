/**
 * Example of a properly typed route using shared types and type guards
 * This demonstrates how to use the new shared types package
 */

import { Router, Request, Response } from 'express';
import { 
  CreateUserRequest,
  CreateUserResponse,
  APIResponse,
  APIValidationSchemas,
  ValidationErrorFormatter
} from '@singura/shared-types';

const exampleRouter = Router();

/**
 * Example: Create user endpoint with proper typing
 */
exampleRouter.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body using shared type guards
    const validation = APIValidationSchemas.createUser.validate(req.body);
    
    if (!validation.isValid) {
      const response: APIResponse<never> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: ValidationErrorFormatter.format(validation.errors)
        }
      };
      res.status(400).json(response);
      return;
    }

    // TypeScript now knows req.body is properly typed as CreateUserRequest
    const userData = validation.data!;
    
    // Mock user creation logic
    const newUser = {
      id: 'user_' + Date.now(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      organizationId: userData.organizationId,
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const response: APIResponse<CreateUserResponse> = {
      success: true,
      data: {
        user: newUser,
        message: 'User created successfully'
      }
    };
    
    res.status(201).json(response);
  } catch (error) {
    const response: APIResponse<never> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    };
    res.status(500).json(response);
  }
});

export { exampleRouter };
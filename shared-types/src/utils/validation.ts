/**
 * Validation utility types and type guards
 */

import { 
  UUID, 
  EmailAddress, 
  URLString, 
  ISODateString,
  ValidationResult,
  ValidationError,
  TypeGuard 
} from './common';

/**
 * Type guard for checking if a value is a string
 */
export const isString: TypeGuard<string> = (value): value is string => {
  return typeof value === 'string';
};

/**
 * Type guard for checking if a value is a number
 */
export const isNumber: TypeGuard<number> = (value): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

/**
 * Type guard for checking if a value is a boolean
 */
export const isBoolean: TypeGuard<boolean> = (value): value is boolean => {
  return typeof value === 'boolean';
};

/**
 * Type guard for checking if a value is a Date
 */
export const isDate: TypeGuard<Date> = (value): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

/**
 * Type guard for checking if a value is an object
 */
export const isObject: TypeGuard<Record<string, unknown>> = (value): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard for checking if a value is an array
 */
export const isArray: TypeGuard<unknown[]> = (value): value is unknown[] => {
  return Array.isArray(value);
};

/**
 * Type guard for checking if a value is a non-empty array
 */
export const isNonEmptyArray: TypeGuard<[unknown, ...unknown[]]> = (value): value is [unknown, ...unknown[]] => {
  return Array.isArray(value) && value.length > 0;
};

/**
 * Type guard for UUID validation
 */
export const isUUID: TypeGuard<UUID> = (value): value is UUID => {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Type guard for email validation
 */
export const isEmailAddress: TypeGuard<EmailAddress> = (value): value is EmailAddress => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) && value.length <= 254;
};

/**
 * Type guard for URL validation
 */
export const isURLString: TypeGuard<URLString> = (value): value is URLString => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Type guard for ISO date string validation
 */
export const isISODateString: TypeGuard<ISODateString> = (value): value is ISODateString => {
  if (!isString(value)) return false;
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(value)) return false;
  
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Validation schema interface
 */
export type ValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldValidator<T[K]>;
};

/**
 * Field validator interface
 */
export interface FieldValidator<T> {
  required?: boolean;
  type?: TypeGuard<T>;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  transform?: (value: unknown) => T;
}

/**
 * Generic validator class
 */
export class SchemaValidator<T extends Record<string, unknown>> {
  constructor(private schema: ValidationSchema<T>) {}

  validate(data: unknown): ValidationResult & { data?: T } {
    const errors: ValidationError[] = [];
    const result: Partial<T> = {};

    if (!isObject(data)) {
      errors.push({
        field: 'root',
        code: 'INVALID_TYPE',
        message: 'Input must be an object',
        value: data
      });
      return { isValid: false, errors };
    }

    for (const [field, validator] of Object.entries(this.schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, validator as FieldValidator<unknown>);
      errors.push(...fieldErrors);

      if (fieldErrors.length === 0) {
        if (validator.transform) {
          result[field as keyof T] = validator.transform(value) as T[keyof T];
        } else {
          result[field as keyof T] = value as T[keyof T];
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? result as T : undefined
    };
  }

  private validateField(
    field: string, 
    value: unknown, 
    validator: FieldValidator<unknown>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required
    if (validator.required && (value === undefined || value === null)) {
      errors.push({
        field,
        code: 'REQUIRED',
        message: `${field} is required`,
        value
      });
      return errors;
    }

    // Skip other validations if value is undefined/null and not required
    if (value === undefined || value === null) {
      return errors;
    }

    // Type validation
    if (validator.type && !validator.type(value)) {
      errors.push({
        field,
        code: 'INVALID_TYPE',
        message: `${field} has invalid type`,
        value
      });
      return errors; // Stop validation on type error
    }

    // String validations
    if (isString(value)) {
      if (validator.minLength && value.length < validator.minLength) {
        errors.push({
          field,
          code: 'MIN_LENGTH',
          message: `${field} must be at least ${validator.minLength} characters`,
          value
        });
      }

      if (validator.maxLength && value.length > validator.maxLength) {
        errors.push({
          field,
          code: 'MAX_LENGTH',
          message: `${field} must be at most ${validator.maxLength} characters`,
          value
        });
      }

      if (validator.pattern && !validator.pattern.test(value)) {
        errors.push({
          field,
          code: 'INVALID_FORMAT',
          message: `${field} format is invalid`,
          value
        });
      }
    }

    // Number validations
    if (isNumber(value)) {
      if (validator.min !== undefined && value < validator.min) {
        errors.push({
          field,
          code: 'MIN_VALUE',
          message: `${field} must be at least ${validator.min}`,
          value
        });
      }

      if (validator.max !== undefined && value > validator.max) {
        errors.push({
          field,
          code: 'MAX_VALUE',
          message: `${field} must be at most ${validator.max}`,
          value
        });
      }
    }

    // Custom validation
    if (validator.custom) {
      const customResult = validator.custom(value);
      if (customResult !== true) {
        errors.push({
          field,
          code: 'CUSTOM_VALIDATION',
          message: typeof customResult === 'string' ? customResult : `${field} failed custom validation`,
          value
        });
      }
    }

    return errors;
  }
}

/**
 * Common validation schemas
 */
export const CommonValidators = {
  email: {
    required: true,
    type: isString,
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    transform: (value: unknown) => (value as string).toLowerCase().trim()
  } as FieldValidator<string>,

  password: {
    required: true,
    type: isString,
    minLength: 8,
    maxLength: 128,
    custom: (value: string) => {
      if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
      if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
      if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
      if (!/[^a-zA-Z0-9]/.test(value)) return 'Password must contain at least one special character';
      return true;
    }
  } as FieldValidator<string>,

  uuid: {
    required: true,
    type: isUUID
  } as FieldValidator<UUID>,

  url: {
    required: true,
    type: isURLString
  } as FieldValidator<URLString>,

  positiveInteger: {
    required: true,
    type: isNumber,
    min: 1,
    custom: (value: number) => Number.isInteger(value) || 'Must be an integer'
  } as FieldValidator<number>,

  nonEmptyString: {
    required: true,
    type: isString,
    minLength: 1,
    transform: (value: unknown) => (value as string).trim()
  } as FieldValidator<string>,

  optionalString: {
    required: false,
    type: isString,
    transform: (value: unknown) => value ? (value as string).trim() : undefined
  } as FieldValidator<string | undefined>,

  isoDate: {
    required: true,
    type: isString,
    custom: (value: string) => isISODateString(value) || 'Must be a valid ISO date string'
  } as FieldValidator<string>
};

/**
 * Validation error formatter
 */
export class ValidationErrorFormatter {
  static format(errors: ValidationError[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    
    for (const error of errors) {
      if (!formatted[error.field]) {
        formatted[error.field] = [];
      }
      formatted[error.field]!.push(error.message);
    }
    
    return formatted;
  }

  static formatFlat(errors: ValidationError[]): string[] {
    return errors.map(error => `${error.field}: ${error.message}`);
  }

  static formatForAPI(errors: ValidationError[]) {
    return {
      error: 'Validation failed',
      details: this.format(errors),
      fields: errors.map(error => ({
        field: error.field,
        code: error.code,
        message: error.message
      }))
    };
  }
}

/**
 * Runtime type assertion utilities
 */
export function assertIsString(value: unknown, fieldName = 'value'): asserts value is string {
  if (!isString(value)) {
    throw new TypeError(`${fieldName} must be a string, got ${typeof value}`);
  }
}

export function assertIsNumber(value: unknown, fieldName = 'value'): asserts value is number {
  if (!isNumber(value)) {
    throw new TypeError(`${fieldName} must be a number, got ${typeof value}`);
  }
}

export function assertIsUUID(value: unknown, fieldName = 'value'): asserts value is UUID {
  if (!isUUID(value)) {
    throw new TypeError(`${fieldName} must be a valid UUID, got ${value}`);
  }
}

export function assertIsEmailAddress(value: unknown, fieldName = 'value'): asserts value is EmailAddress {
  if (!isEmailAddress(value)) {
    throw new TypeError(`${fieldName} must be a valid email address, got ${value}`);
  }
}

/**
 * Safe parsing utilities
 */
export function safeParseInt(value: unknown, defaultValue = 0): number {
  if (isNumber(value)) return Math.floor(value);
  if (isString(value)) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

export function safeParseFloat(value: unknown, defaultValue = 0): number {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

export function safeParseBoolean(value: unknown, defaultValue = false): boolean {
  if (isBoolean(value)) return value;
  if (isString(value)) {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (isNumber(value)) {
    return value !== 0;
  }
  return defaultValue;
}

export function safeParseJSON<T = unknown>(value: unknown, defaultValue?: T): T | undefined {
  if (!isString(value)) return defaultValue;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Domain-specific type guards
 */
export const isDomainTypeGuard = {
  /** Type guard for Platform enum */
  isPlatform: (value: unknown): value is import('../models').Platform => {
    return isString(value) && ['slack', 'google', 'microsoft', 'github', 'atlassian', 'notion'].includes(value);
  },

  /** Type guard for User Role */
  isUserRole: (value: unknown): value is import('../models').UserRole => {
    return isString(value) && ['admin', 'owner', 'member', 'viewer'].includes(value);
  },

  /** Type guard for Connection Status */
  isConnectionStatus: (value: unknown): value is import('../models').ConnectionStatus => {
    return isString(value) && ['active', 'inactive', 'error', 'expired', 'pending'].includes(value);
  },

  /** Type guard for Automation Type */
  isAutomationType: (value: unknown): value is import('../models').AutomationType => {
    return isString(value) && ['workflow', 'bot', 'integration', 'webhook', 'scheduled_task', 'trigger'].includes(value);
  },

  /** Type guard for Automation Status */
  isAutomationStatus: (value: unknown): value is import('../models').AutomationStatus => {
    return isString(value) && ['active', 'inactive', 'paused', 'error', 'unknown'].includes(value);
  },

  /** Type guard for Risk Level */
  isRiskLevel: (value: unknown): value is import('../models').RiskLevel => {
    return isString(value) && ['low', 'medium', 'high', 'critical'].includes(value);
  }
} as const;

/**
 * API request validation schemas
 */
export const APIValidationSchemas = {
  createUser: new SchemaValidator({
    name: CommonValidators.nonEmptyString,
    email: CommonValidators.email,
    role: { 
      required: true,
      type: isString,
      custom: (value: string) => isDomainTypeGuard.isUserRole(value) || 'Invalid user role'
    },
    organizationId: CommonValidators.uuid
  }),

  createConnection: new SchemaValidator({
    platform: {
      required: true,
      type: isString,
      custom: (value: string) => isDomainTypeGuard.isPlatform(value) || 'Invalid platform'
    },
    name: CommonValidators.nonEmptyString,
    organizationId: CommonValidators.uuid
  }),

  updateAutomation: new SchemaValidator({
    name: CommonValidators.optionalString,
    status: {
      required: false,
      type: isString,
      custom: (value: string) => isDomainTypeGuard.isAutomationStatus(value) || 'Invalid automation status'
    }
  })
} as const;
/**
 * Login Form Component
 * Handles user authentication with email and password
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, useAuthActions, useAuthError, useAuthLoading } from '@/stores/auth';
import { useUIActions } from '@/stores/ui';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  className?: string;
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  className,
  onSuccess 
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth state
  const { login } = useAuthActions();
  const isLoading = useAuthLoading();
  const authError = useAuthError();
  
  // UI actions
  const { showSuccess, showError } = useUIActions();

  // Form handling
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Clear auth errors when form changes
  useEffect(() => {
    if (authError) {
      clearErrors();
    }
  }, [authError, clearErrors]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearErrors();
      
      const success = await login({
        email: data.email,
        password: data.password,
      });

      if (success) {
        showSuccess('Login successful', 'Welcome back!');
        
        // Redirect to intended page or dashboard
        const redirectTo = searchParams.get('redirect') || '/dashboard';
        navigate(redirectTo, { replace: true });
        
        onSuccess?.();
      } else {
        // Error is handled by the auth store and displayed below
        setError('root', {
          type: 'manual',
          message: authError || 'Login failed. Please try again.',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
      showError(errorMessage, 'Login Failed');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={cn("w-full max-w-md space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center mb-4" data-testid="app-logo">
          <Shield className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground">{BRAND.name}</h1>
        </div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="login-title">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error Display */}
      {(authError || errors.root) && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4" data-testid="error-message">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              {errors.root?.message || authError}
            </div>
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
            autoComplete="email"
            autoFocus
            data-testid="email-input"
          />
          {errors.email && (
            <div className="text-sm text-destructive" data-testid="email-error">
              {errors.email.message}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
              autoComplete="current-password"
              className="pr-10"
              data-testid="password-input"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <div className="text-sm text-destructive" data-testid="password-error">
              {errors.password.message}
            </div>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2">
          <input
            id="rememberMe"
            type="checkbox"
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-2"
            {...register('rememberMe')}
          />
          <Label 
            htmlFor="rememberMe"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Remember me for 30 days
          </Label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
          loading={isLoading || isSubmitting}
          disabled={isLoading || isSubmitting}
          data-testid="login-button"
        >
          {isLoading || isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {/* Session Expired Message */}
      {searchParams.get('session') === 'expired' && (
        <div className="rounded-md bg-orange-50 border border-orange-200 p-3" data-testid="session-expired-message">
          <div className="text-sm text-orange-700">
            Your session has expired. Please sign in again.
          </div>
        </div>
      )}

      {/* Additional Links */}
      <div className="text-center space-y-2">
        <button
          type="button"
          className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline"
          onClick={() => {
            // TODO: Implement forgot password
            showError('Forgot password functionality coming soon');
          }}
          data-testid="forgot-password-link"
        >
          Forgot your password?
        </button>
        
        <div className="text-xs text-muted-foreground">
          Having trouble signing in?{' '}
          <button
            type="button"
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
            onClick={() => {
              // TODO: Implement support contact
              showError('Support contact functionality coming soon');
            }}
            data-testid="signup-link"
          >
            Contact support
          </button>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Your security is our priority</p>
            <p>
              Your login is protected with enterprise-grade security including JWT tokens,
              encrypted connections, and comprehensive audit logging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
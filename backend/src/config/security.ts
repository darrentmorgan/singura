/**
 * Enterprise security configuration for SaaS X-Ray
 * Centralizes all security settings and compliance requirements
 */

export interface SecurityConfiguration {
  encryption: {
    algorithm: string;
    keyRotationIntervalDays: number;
    keyDerivationRounds: number;
    backupRetentionDays: number;
  };
  authentication: {
    jwtAlgorithm: string;
    accessTokenTTL: string;
    refreshTokenTTL: string;
    maxConcurrentSessions: number;
    sessionTimeoutMinutes: number;
  };
  oauth: {
    stateExpirationMinutes: number;
    maxCallbackAttempts: number;
    tokenRefreshBuffer: number; // minutes before expiry to refresh
    supportedPlatforms: string[];
  };
  rateLimit: {
    general: {
      windowMs: number;
      maxRequests: number;
    };
    auth: {
      windowMs: number;
      maxRequests: number;
    };
    api: {
      windowMs: number;
      maxRequests: number;
    };
  };
  security: {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      preventReuse: number;
    };
    sessionSecurity: {
      requireHttps: boolean;
      sameSiteCookie: 'strict' | 'lax' | 'none';
      httpOnlyCookie: boolean;
      secureFlag: boolean;
    };
  };
  monitoring: {
    alertThresholds: {
      failedLoginsPerMinute: number;
      suspiciousRequestsPerMinute: number;
      errorRatePercentage: number;
      responseTimeMs: number;
    };
    auditRetentionDays: number;
    realTimeMonitoring: boolean;
  };
  compliance: {
    gdpr: {
      enabled: boolean;
      dataRetentionDays: number;
      anonymizationDelay: number;
    };
    soc2: {
      enabled: boolean;
      auditingLevel: 'basic' | 'detailed' | 'comprehensive';
      encryptionAtRest: boolean;
      encryptionInTransit: boolean;
    };
    owasp: {
      enabled: boolean;
      securityHeaders: boolean;
      contentSecurityPolicy: boolean;
      xssProtection: boolean;
    };
  };
}

/**
 * Load security configuration from environment variables
 */
function loadSecurityConfig(): SecurityConfiguration {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  return {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyRotationIntervalDays: parseInt(process.env.KEY_ROTATION_DAYS || '90'),
      keyDerivationRounds: parseInt(process.env.KEY_DERIVATION_ROUNDS || '600000'),
      backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '365')
    },
    authentication: {
      jwtAlgorithm: 'RS256',
      accessTokenTTL: process.env.ACCESS_TOKEN_TTL || '15m',
      refreshTokenTTL: process.env.REFRESH_TOKEN_TTL || '7d',
      maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
      sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60')
    },
    oauth: {
      stateExpirationMinutes: parseInt(process.env.OAUTH_STATE_EXPIRATION || '10'),
      maxCallbackAttempts: parseInt(process.env.OAUTH_MAX_CALLBACK_ATTEMPTS || '3'),
      tokenRefreshBuffer: parseInt(process.env.TOKEN_REFRESH_BUFFER_MINUTES || '10'),
      supportedPlatforms: (process.env.SUPPORTED_OAUTH_PLATFORMS || 'slack,google,microsoft').split(',')
    },
    rateLimit: {
      general: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
      },
      auth: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5')
      },
      api: {
        windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
        maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '60')
      }
    },
    security: {
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30'),
      passwordPolicy: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
        preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5')
      },
      sessionSecurity: {
        requireHttps: process.env.REQUIRE_HTTPS !== 'false' && isProd,
        sameSiteCookie: (process.env.SAME_SITE_COOKIE as 'strict' | 'lax' | 'none') || 'strict',
        httpOnlyCookie: process.env.HTTP_ONLY_COOKIE !== 'false',
        secureFlag: process.env.SECURE_COOKIE_FLAG !== 'false' && isProd
      }
    },
    monitoring: {
      alertThresholds: {
        failedLoginsPerMinute: parseInt(process.env.ALERT_FAILED_LOGINS_PER_MINUTE || '10'),
        suspiciousRequestsPerMinute: parseInt(process.env.ALERT_SUSPICIOUS_REQUESTS_PER_MINUTE || '20'),
        errorRatePercentage: parseInt(process.env.ALERT_ERROR_RATE_PERCENTAGE || '5'),
        responseTimeMs: parseInt(process.env.ALERT_RESPONSE_TIME_MS || '5000')
      },
      auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'), // 7 years for compliance
      realTimeMonitoring: process.env.REAL_TIME_MONITORING !== 'false'
    },
    compliance: {
      gdpr: {
        enabled: process.env.GDPR_COMPLIANCE === 'true',
        dataRetentionDays: parseInt(process.env.GDPR_DATA_RETENTION_DAYS || '2555'), // 7 years
        anonymizationDelay: parseInt(process.env.GDPR_ANONYMIZATION_DELAY || '30')
      },
      soc2: {
        enabled: process.env.SOC2_COMPLIANCE === 'true',
        auditingLevel: (process.env.SOC2_AUDITING_LEVEL as 'basic' | 'detailed' | 'comprehensive') || 'detailed',
        encryptionAtRest: process.env.SOC2_ENCRYPTION_AT_REST !== 'false',
        encryptionInTransit: process.env.SOC2_ENCRYPTION_IN_TRANSIT !== 'false'
      },
      owasp: {
        enabled: process.env.OWASP_COMPLIANCE !== 'false',
        securityHeaders: process.env.OWASP_SECURITY_HEADERS !== 'false',
        contentSecurityPolicy: process.env.OWASP_CSP !== 'false',
        xssProtection: process.env.OWASP_XSS_PROTECTION !== 'false'
      }
    }
  };
}

/**
 * Validate security configuration
 */
function validateSecurityConfig(config: SecurityConfiguration): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate encryption settings
  if (config.encryption.keyRotationIntervalDays < 30) {
    errors.push('Key rotation interval must be at least 30 days');
  }

  if (config.encryption.keyDerivationRounds < 100000) {
    errors.push('Key derivation rounds must be at least 100,000 for security');
  }

  // Validate authentication settings
  if (!config.authentication.jwtAlgorithm.startsWith('RS') && !config.authentication.jwtAlgorithm.startsWith('ES')) {
    errors.push('JWT algorithm must use asymmetric encryption (RS256, RS384, RS512, ES256, etc.)');
  }

  // Validate password policy
  if (config.security.passwordPolicy.minLength < 8) {
    errors.push('Password minimum length must be at least 8 characters');
  }

  // Validate rate limiting
  if (config.rateLimit.auth.maxRequests > 10) {
    errors.push('Authentication rate limit should not exceed 10 requests per window for security');
  }

  // Validate monitoring thresholds
  if (config.monitoring.alertThresholds.failedLoginsPerMinute < 5) {
    errors.push('Failed login alert threshold should be at least 5 per minute');
  }

  // Validate compliance settings
  if (config.compliance.soc2.enabled && !config.compliance.soc2.encryptionAtRest) {
    errors.push('SOC 2 compliance requires encryption at rest');
  }

  if (config.compliance.gdpr.enabled && config.compliance.gdpr.dataRetentionDays > 2555) {
    errors.push('GDPR compliance may require shorter data retention periods');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get security configuration with validation
 */
export function getSecurityConfig(): SecurityConfiguration {
  const config = loadSecurityConfig();
  const validation = validateSecurityConfig(config);

  if (!validation.valid) {
    console.error('Security configuration validation failed:', validation.errors);
    throw new Error(`Security configuration invalid: ${validation.errors.join(', ')}`);
  }

  return config;
}

/**
 * Environment-specific security presets
 */
export const SecurityPresets = {
  development: {
    requireHttps: false,
    maxLoginAttempts: 10,
    lockoutDurationMinutes: 5,
    auditRetentionDays: 30,
    realTimeMonitoring: false
  },
  
  staging: {
    requireHttps: true,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    auditRetentionDays: 90,
    realTimeMonitoring: true
  },
  
  production: {
    requireHttps: true,
    maxLoginAttempts: 3,
    lockoutDurationMinutes: 30,
    auditRetentionDays: 2555, // 7 years
    realTimeMonitoring: true
  }
};

/**
 * Security feature flags
 */
export const SecurityFeatures = {
  // Enhanced security features
  ADVANCED_THREAT_DETECTION: process.env.ENABLE_ADVANCED_THREAT_DETECTION === 'true',
  BEHAVIORAL_ANALYSIS: process.env.ENABLE_BEHAVIORAL_ANALYSIS === 'true',
  REAL_TIME_ALERTS: process.env.ENABLE_REAL_TIME_ALERTS === 'true',
  
  // Compliance features
  GDPR_MODE: process.env.GDPR_COMPLIANCE === 'true',
  SOC2_MODE: process.env.SOC2_COMPLIANCE === 'true',
  HIPAA_MODE: process.env.HIPAA_COMPLIANCE === 'true',
  
  // Development features
  SECURITY_TESTING: process.env.NODE_ENV === 'development' && process.env.ENABLE_SECURITY_TESTING === 'true',
  VULNERABILITY_SCANNING: process.env.ENABLE_VULNERABILITY_SCANNING === 'true',
  PENETRATION_TESTING_MODE: process.env.PENETRATION_TESTING_MODE === 'true'
};

/**
 * Required environment variables for security
 */
export const RequiredSecurityEnvVars = [
  'MASTER_ENCRYPTION_KEY',
  'ENCRYPTION_SALT',
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'FRONTEND_URL',
  'API_URL'
];

/**
 * Validate required environment variables
 */
export function validateSecurityEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const envVar of RequiredSecurityEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Additional validations
  if (process.env.MASTER_ENCRYPTION_KEY && process.env.MASTER_ENCRYPTION_KEY.length < 64) {
    missing.push('MASTER_ENCRYPTION_KEY (must be at least 64 characters)');
  }

  if (process.env.JWT_PRIVATE_KEY && !process.env.JWT_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')) {
    missing.push('JWT_PRIVATE_KEY (must be a valid PEM private key)');
  }

  if (process.env.JWT_PUBLIC_KEY && !process.env.JWT_PUBLIC_KEY.includes('-----BEGIN PUBLIC KEY-----')) {
    missing.push('JWT_PUBLIC_KEY (must be a valid PEM public key)');
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

// Export the configured security instance
export const securityConfig = getSecurityConfig();
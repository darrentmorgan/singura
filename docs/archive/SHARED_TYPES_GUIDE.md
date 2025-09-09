# Shared Types Implementation Guide
**SaaS X-Ray Platform - Comprehensive Type Sharing Architecture**

---

## Package Overview

The `@saas-xray/shared-types` package is the cornerstone of SaaS X-Ray's type safety strategy, providing a centralized repository of TypeScript definitions that ensure contract consistency between frontend and backend services.

### Architecture Philosophy

**Single Source of Truth**: All type definitions originate from the shared-types package, eliminating duplication and preventing contract drift between services.

**Domain-Driven Organization**: Types are organized by business domain rather than technical layers, making them intuitive to locate and maintain.

**Extensibility by Design**: Generic interfaces and discriminated unions allow for platform-specific extensions without breaking core contracts.

### Package Structure

```
@saas-xray/shared-types/
├── src/
│   ├── api/                    # API contract definitions
│   │   ├── requests.ts         # Request payload interfaces
│   │   ├── responses.ts        # Response payload interfaces  
│   │   └── errors.ts           # Error response standards
│   ├── models/                 # Domain entity definitions
│   │   ├── automation.ts       # Automation discovery models
│   │   └── connection.ts       # Platform connection models
│   ├── oauth/                  # OAuth-specific types
│   │   ├── credentials.ts      # Credential management interfaces
│   │   └── platforms.ts        # Platform-specific OAuth types
│   ├── platforms/              # Platform extensions
│   │   ├── google.ts           # Google Workspace types
│   │   └── microsoft.ts        # Microsoft 365 types
│   └── utils/                  # Utility and infrastructure types
│       ├── common.ts           # Common utility types
│       ├── database.ts         # Database operation types
│       ├── database-types.ts   # Database schema interfaces
│       ├── type-guards.ts      # Runtime type validation
│       ├── job-types.ts        # Background job definitions
│       └── socket-types.ts     # Real-time communication types
├── dist/                       # Compiled JavaScript and type definitions
├── package.json               # Package configuration
└── tsconfig.json              # TypeScript compilation settings
```

### Build and Deployment Integration

**TypeScript Configuration**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**NPM Scripts**:
- `npm run build`: Compiles TypeScript to JavaScript and generates .d.ts files
- `npm run dev`: Watches for changes and recompiles automatically
- `npm run type-check`: Validates types without emitting files
- `npm run clean`: Removes compiled artifacts

**Publication Strategy**:
- Private NPM registry for internal distribution
- Semantic versioning (MAJOR.MINOR.PATCH)
- Automated builds triggered by git tags
- Both source and compiled files included in package

---

## Usage Guidelines

### Frontend Integration Patterns

**Installation and Setup**:
```bash
npm install @saas-xray/shared-types@latest
```

**React Component Type Safety**:
```typescript
import { 
  PlatformConnection, 
  CreateConnectionRequest,
  CreateConnectionResponse,
  APIError 
} from '@saas-xray/shared-types';

interface ConnectionCardProps {
  connection: PlatformConnection;
  onUpdate: (request: CreateConnectionRequest) => Promise<CreateConnectionResponse>;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({ 
  connection, 
  onUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);

  const handleUpdate = async (updates: Partial<CreateConnectionRequest>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await onUpdate({
        platform: connection.platform_type,
        organizationId: connection.organization_id,
        ...updates
      });
      
      // TypeScript ensures response matches expected structure
      console.log('Updated connection:', response.connectionId);
    } catch (err) {
      // Type-safe error handling
      if (isAPIError(err)) {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Component implementation...
};
```

**API Client Type Safety**:
```typescript
import axios, { AxiosResponse } from 'axios';
import { 
  CreateConnectionRequest,
  CreateConnectionResponse,
  PlatformConnection,
  PaginatedResult
} from '@saas-xray/shared-types';

class ConnectionsAPI {
  private baseURL = '/api/v1';

  async createConnection(
    request: CreateConnectionRequest
  ): Promise<CreateConnectionResponse> {
    const response: AxiosResponse<CreateConnectionResponse> = await axios.post(
      `${this.baseURL}/connections`,
      request
    );
    
    // TypeScript validates response structure at compile time
    return response.data;
  }

  async getConnections(
    organizationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<PlatformConnection>> {
    const response: AxiosResponse<PaginatedResult<PlatformConnection>> = 
      await axios.get(`${this.baseURL}/connections`, {
        params: { organizationId, page, limit }
      });
    
    return response.data;
  }
}

export const connectionsAPI = new ConnectionsAPI();
```

**State Management Integration** (Zustand):
```typescript
import { create } from 'zustand';
import { 
  PlatformConnection, 
  APIError,
  ConnectionStatus 
} from '@saas-xray/shared-types';

interface ConnectionsStore {
  connections: PlatformConnection[];
  loading: boolean;
  error: APIError | null;
  
  // Actions with proper typing
  setConnections: (connections: PlatformConnection[]) => void;
  updateConnection: (id: string, updates: Partial<PlatformConnection>) => void;
  setError: (error: APIError | null) => void;
}

export const useConnectionsStore = create<ConnectionsStore>((set, get) => ({
  connections: [],
  loading: false,
  error: null,

  setConnections: (connections) => set({ connections, error: null }),
  
  updateConnection: (id, updates) => set((state) => ({
    connections: state.connections.map(conn => 
      conn.id === id ? { ...conn, ...updates } : conn
    )
  })),

  setError: (error) => set({ error, loading: false })
}));
```

### Backend Implementation Examples

**Express.js Route Handler Type Safety**:
```typescript
import { Request, Response } from 'express';
import { 
  CreateConnectionRequest,
  CreateConnectionResponse,
  APIError,
  ValidationError
} from '@saas-xray/shared-types';
import { oauthService } from '../services/oauth-service';
import { createAPIError, createValidationError } from '../utils/errors';

// Typed request interface
interface TypedRequest<T> extends Request {
  body: T;
}

export const createConnection = async (
  req: TypedRequest<CreateConnectionRequest>,
  res: Response<CreateConnectionResponse | APIError>
) => {
  try {
    // Request body is fully typed
    const { platform, organizationId, credentials } = req.body;
    
    // Service methods return typed results
    const result = await oauthService.completeOAuthFlow(
      platform,
      credentials.code,
      credentials.state,
      req.user.id,
      organizationId,
      req
    );

    // Response is type-checked
    const response: CreateConnectionResponse = {
      connectionId: result.connectionId,
      status: 'created',
      connection: {
        id: result.connectionId,
        platform_type: platform,
        organization_id: organizationId,
        display_name: result.displayName,
        status: 'active',
        permissions_granted: result.permissions,
        expires_at: result.expiresAt || null,
        created_at: new Date(),
        updated_at: new Date(),
        platform_user_id: 'user_id',
        metadata: {}
      }
    };

    res.status(201).json(response);
  } catch (error) {
    const apiError = createAPIError(
      error instanceof Error ? error.message : 'Connection creation failed',
      'CONNECTION_CREATE_ERROR',
      400
    );
    res.status(400).json(apiError);
  }
};
```

**Service Layer Type Safety**:
```typescript
import { 
  PlatformConnection,
  OAuthCredentials,
  Platform,
  ConnectionStatus 
} from '@saas-xray/shared-types';
import { platformConnectionRepository } from '../database/repositories/platform-connection';

export class ConnectionService {
  async createConnection(
    organizationId: string,
    platform: Platform,
    credentials: OAuthCredentials
  ): Promise<PlatformConnection> {
    
    // Input validation with type safety
    this.validatePlatform(platform);
    this.validateCredentials(credentials);

    // Repository operations are fully typed
    const connectionData = {
      organization_id: organizationId,
      platform_type: platform,
      platform_user_id: credentials.userId,
      display_name: this.createDisplayName(platform, credentials),
      status: 'active' as ConnectionStatus,
      permissions_granted: credentials.scopes || [],
      expires_at: credentials.expiresAt || null,
      metadata: this.createMetadata(platform, credentials)
    };

    // Type-safe database operation
    const connection = await platformConnectionRepository.create(connectionData);
    
    return connection;
  }

  private validatePlatform(platform: Platform): void {
    const supportedPlatforms: Platform[] = ['slack', 'google', 'microsoft'];
    if (!supportedPlatforms.includes(platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private validateCredentials(credentials: OAuthCredentials): void {
    if (!credentials.accessToken) {
      throw new Error('Access token is required');
    }
    // Additional validation logic...
  }
}
```

### API Contract Definition Standards

**Request Interface Standards**:
```typescript
// Base request interface
interface BaseRequest {
  organizationId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Specific request interfaces extend base
interface CreateAutomationRequest extends BaseRequest {
  name: string;
  platform: Platform;
  triggerConditions: TriggerCondition[];
  actions: AutomationAction[];
  schedule?: CronSchedule;
}

// Use discriminated unions for different request types
type DiscoveryRequest = 
  | { type: 'full_scan'; organizationId: string; platforms: Platform[] }
  | { type: 'incremental'; organizationId: string; since: Date }
  | { type: 'platform_specific'; organizationId: string; platform: Platform };
```

**Response Interface Standards**:
```typescript
// Base response interface with consistent structure
interface BaseResponse {
  status: 'success' | 'error' | 'partial';
  timestamp: Date;
  requestId: string;
}

// Success response pattern
interface CreateAutomationResponse extends BaseResponse {
  status: 'success';
  data: {
    automationId: string;
    automation: AutomationEntity;
  };
}

// Error response pattern  
interface ErrorResponse extends BaseResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Paginated response pattern
interface PaginatedResponse<T> extends BaseResponse {
  status: 'success';
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}
```

---

## Contribution Guidelines

### Adding New Type Definitions

**Step-by-Step Process**:

1. **Identify the Domain**: Determine which domain folder your types belong to
2. **Create Interface**: Define the interface with comprehensive JSDoc comments
3. **Add Exports**: Update the appropriate index.ts file
4. **Create Tests**: Add type-only tests to verify interface contracts
5. **Update Documentation**: Document new types and their usage patterns

**Example: Adding New Platform Integration**:
```typescript
// 1. Create new file: src/platforms/salesforce.ts
/**
 * Salesforce platform-specific types for SaaS X-Ray integration
 */

import { Platform, OAuthCredentials } from '../oauth/platforms';

export interface SalesforceCredentials extends OAuthCredentials {
  platform: 'salesforce';
  instanceUrl: string;
  orgId: string;
  apiVersion: string;
}

export interface SalesforceUserInfo {
  id: string;
  username: string;
  email: string;
  organizationId: string;
  profileId: string;
  userType: 'Standard' | 'PowerPartner' | 'CustomerSuccess';
}

export interface SalesforceAutomation {
  id: string;
  name: string;
  type: 'flow' | 'workflow' | 'process_builder' | 'apex_trigger';
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  lastModified: Date;
  triggerType: 'manual' | 'scheduled' | 'record_change';
  metadata: {
    namespace?: string;
    apiName: string;
    description?: string;
  };
}

// 2. Update src/oauth/platforms.ts to add 'salesforce' to Platform union
export type Platform = 'slack' | 'google' | 'microsoft' | 'salesforce';

// 3. Update src/index.ts to export new types
export * from './platforms/salesforce';

// 4. Create type tests: tests/types/salesforce.test.ts
describe('Salesforce Types', () => {
  it('should accept valid SalesforceCredentials', () => {
    const credentials: SalesforceCredentials = {
      platform: 'salesforce',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      instanceUrl: 'https://myorg.salesforce.com',
      orgId: '00D000000000000EAA',
      apiVersion: 'v58.0',
      expiresAt: new Date(),
      scopes: ['api', 'refresh_token']
    };
    
    expect(credentials.platform).toBe('salesforce');
  });
});
```

### Maintaining Backward Compatibility

**Versioning Strategy**:
- **Patch Version (1.0.X)**: Bug fixes, documentation updates, non-breaking additions
- **Minor Version (1.X.0)**: New features, new interfaces, extended enums
- **Major Version (X.0.0)**: Breaking changes, removed interfaces, renamed properties

**Breaking Change Process**:
1. **Deprecation Notice**: Mark old interfaces as deprecated with JSDoc @deprecated
2. **Migration Period**: Provide both old and new interfaces for at least one minor version
3. **Migration Guide**: Document how to migrate from old to new interfaces
4. **Breaking Change**: Remove deprecated interfaces in next major version

**Example: Safe Interface Evolution**:
```typescript
// Version 1.5.0 - Add new optional field
interface PlatformConnection {
  id: string;
  platform_type: Platform;
  organization_id: string;
  // New optional field - non-breaking
  risk_score?: number;
}

// Version 1.6.0 - Deprecate old field name
interface PlatformConnection {
  id: string;
  platform_type: Platform;
  organization_id: string;
  risk_score: number;
  
  /** @deprecated Use risk_score instead */
  riskScore?: number;
}

// Version 2.0.0 - Remove deprecated field
interface PlatformConnection {
  id: string;
  platform_type: Platform;
  organization_id: string;
  risk_score: number;
}
```

### Version Management Strategy

**Development Workflow**:
1. **Feature Branch**: Create branch for new type definitions
2. **Type Development**: Implement types with comprehensive tests
3. **Version Planning**: Determine appropriate version bump
4. **Release Candidate**: Tag RC version for testing
5. **Production Release**: Tag final version and update dependents

**Dependency Management**:
```json
// package.json in consuming applications
{
  "dependencies": {
    "@saas-xray/shared-types": "^1.5.0"
  }
}

// Pin exact versions for critical releases
{
  "dependencies": {
    "@saas-xray/shared-types": "1.5.2"
  }
}
```

**Automated Validation**:
- GitHub Actions workflow for type checking
- Automated testing against consuming applications
- Breaking change detection through API comparison
- Semantic version validation

---

## Advanced Patterns

### Type Guard Implementations

**Runtime Type Validation**:
```typescript
// src/utils/type-guards.ts
import { 
  PlatformConnection, 
  APIError, 
  OAuthCredentials 
} from '../models';

export function isPlatformConnection(value: unknown): value is PlatformConnection {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'platform_type' in value &&
    'organization_id' in value &&
    typeof (value as any).id === 'string' &&
    ['slack', 'google', 'microsoft'].includes((value as any).platform_type) &&
    typeof (value as any).organization_id === 'string'
  );
}

export function isAPIError(value: unknown): value is APIError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    'message' in value &&
    'code' in value
  );
}

export function isOAuthCredentials(value: unknown): value is OAuthCredentials {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    'platform' in value &&
    typeof (value as any).accessToken === 'string' &&
    ['slack', 'google', 'microsoft'].includes((value as any).platform)
  );
}

// Usage in application code
import { isPlatformConnection } from '@saas-xray/shared-types';

function processConnection(data: unknown) {
  if (isPlatformConnection(data)) {
    // TypeScript now knows 'data' is PlatformConnection
    console.log(`Processing connection for ${data.platform_type}`);
  } else {
    throw new Error('Invalid connection data');
  }
}
```

### Generic Type Constraints

**Repository Pattern Generics**:
```typescript
// Advanced generic constraints for type safety
export interface EntityWithTimestamps {
  created_at: Date;
  updated_at: Date;
}

export interface EntityWithOrganization {
  organization_id: string;
}

export interface CreateInputConstraints {
  // Exclude system-generated fields from creation
  id?: never;
  created_at?: never;
  updated_at?: never;
}

// Generic repository with proper constraints
export abstract class BaseRepository<
  TEntity extends EntityWithTimestamps & EntityWithOrganization,
  TCreateInput extends CreateInputConstraints & Omit<TEntity, 'id' | 'created_at' | 'updated_at'>,
  TUpdateInput extends Partial<Omit<TEntity, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>
> {
  // Repository implementation with type safety
  async create(data: TCreateInput): Promise<TEntity> {
    // TypeScript ensures data doesn't include forbidden fields
    const entityData = {
      ...data,
      id: generateId(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    return this.insert(entityData as TEntity);
  }
}

// Usage with proper type constraints
interface AutomationEntity extends EntityWithTimestamps, EntityWithOrganization {
  id: string;
  name: string;
  platform: Platform;
  status: 'active' | 'inactive';
}

interface CreateAutomationInput {
  organization_id: string;
  name: string;
  platform: Platform;
  status: 'active' | 'inactive';
  // TypeScript prevents including id, created_at, updated_at
}

interface UpdateAutomationInput {
  name?: string;
  status?: 'active' | 'inactive';
  // TypeScript prevents updating id, timestamps, organization_id
}

class AutomationRepository extends BaseRepository<
  AutomationEntity,
  CreateAutomationInput,
  UpdateAutomationInput
> {
  // Inherits all CRUD operations with proper typing
}
```

### Platform-Specific Type Extensions

**Extensible Platform Architecture**:
```typescript
// Base platform types
export interface BasePlatformConfig {
  platform: Platform;
  name: string;
  oauth: OAuthConfig;
  capabilities: PlatformCapability[];
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
}

// Platform-specific extensions using discriminated unions
export type PlatformConfig = 
  | SlackPlatformConfig
  | GooglePlatformConfig  
  | MicrosoftPlatformConfig;

export interface SlackPlatformConfig extends BasePlatformConfig {
  platform: 'slack';
  slack: {
    appId: string;
    teamId?: string;
    enterpriseId?: string;
  };
}

export interface GooglePlatformConfig extends BasePlatformConfig {
  platform: 'google';
  google: {
    projectId: string;
    domain?: string;
    adminEmail?: string;
  };
}

export interface MicrosoftPlatformConfig extends BasePlatformConfig {
  platform: 'microsoft';
  microsoft: {
    tenantId: string;
    authority: string;
    graphApiUrl: string;
  };
}

// Type-safe platform-specific operations
export function getPlatformSpecificConfig<T extends Platform>(
  platform: T,
  configs: PlatformConfig[]
): Extract<PlatformConfig, { platform: T }> | undefined {
  return configs.find(config => config.platform === platform) as 
    Extract<PlatformConfig, { platform: T }> | undefined;
}

// Usage with full type safety
const slackConfig = getPlatformSpecificConfig('slack', allConfigs);
if (slackConfig) {
  // TypeScript knows this is SlackPlatformConfig
  console.log(slackConfig.slack.appId);
}
```

---

## Testing and Validation

### Type-Only Testing

**Interface Contract Validation**:
```typescript
// tests/types/contracts.test.ts
import { 
  CreateConnectionRequest,
  CreateConnectionResponse,
  PlatformConnection 
} from '@saas-xray/shared-types';

// Test that interfaces can be implemented correctly
describe('Type Contract Tests', () => {
  it('should allow valid CreateConnectionRequest', () => {
    const request: CreateConnectionRequest = {
      platform: 'slack',
      organizationId: 'org_123',
      credentials: {
        platform: 'slack',
        accessToken: 'token',
        refreshToken: 'refresh',
        scopes: ['channels:read'],
        expiresAt: new Date()
      }
    };

    // Type assertion succeeds if interface is properly implemented
    expect(request.platform).toBe('slack');
  });

  it('should enforce required fields', () => {
    // @ts-expect-error - missing required organizationId
    const invalidRequest: CreateConnectionRequest = {
      platform: 'slack',
      credentials: {
        platform: 'slack',
        accessToken: 'token',
        scopes: ['channels:read']
      }
    };
  });
});
```

### Runtime Validation Integration

**Zod Schema Generation**:
```typescript
// src/validation/schemas.ts
import { z } from 'zod';
import { Platform, ConnectionStatus } from '@saas-xray/shared-types';

// Create runtime validation schemas that match TypeScript interfaces
export const PlatformSchema = z.enum(['slack', 'google', 'microsoft']);

export const ConnectionStatusSchema = z.enum(['active', 'inactive', 'error']);

export const PlatformConnectionSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  platform_type: PlatformSchema,
  platform_user_id: z.string().min(1),
  display_name: z.string().min(1),
  status: ConnectionStatusSchema,
  permissions_granted: z.array(z.string()),
  expires_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  metadata: z.record(z.unknown()).optional()
});

// Type inference ensures schema matches interface
type InferredConnection = z.infer<typeof PlatformConnectionSchema>;

// Compile-time verification that inferred type matches shared type
const _typeCheck: InferredConnection extends PlatformConnection ? true : false = true;
const _typeCheck2: PlatformConnection extends InferredConnection ? true : false = true;
```

### Integration Testing

**API Contract Testing**:
```typescript
// tests/integration/api-contracts.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { 
  CreateConnectionRequest,
  CreateConnectionResponse,
  APIError 
} from '@saas-xray/shared-types';

describe('API Contract Integration', () => {
  it('should create connection with proper response structure', async () => {
    const requestData: CreateConnectionRequest = {
      platform: 'slack',
      organizationId: 'org_123',
      credentials: {
        platform: 'slack',
        accessToken: 'token',
        scopes: ['channels:read']
      }
    };

    const response = await request(app)
      .post('/api/v1/connections')
      .send(requestData)
      .expect(201);

    // TypeScript ensures response matches expected structure
    const responseData: CreateConnectionResponse = response.body;
    
    expect(responseData.status).toBe('created');
    expect(responseData.connectionId).toBeDefined();
    expect(responseData.connection.platform_type).toBe('slack');
  });

  it('should return proper error structure for invalid requests', async () => {
    const invalidRequest = {
      platform: 'invalid_platform'
      // Missing required fields
    };

    const response = await request(app)
      .post('/api/v1/connections')
      .send(invalidRequest)
      .expect(400);

    // Error response follows APIError interface
    const errorData: APIError = response.body;
    
    expect(errorData.error).toBeDefined();
    expect(errorData.error.code).toBeDefined();
    expect(errorData.error.message).toBeDefined();
  });
});
```

---

## Troubleshooting and Best Practices

### Common Issues and Solutions

**Issue 1: Circular Dependencies**
```typescript
// Problem: Circular import between modules
// models/automation.ts imports from models/connection.ts
// models/connection.ts imports from models/automation.ts

// Solution: Create shared base types
// utils/base-types.ts
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// models/automation.ts
import { BaseEntity } from '../utils/base-types';
export interface Automation extends BaseEntity {
  // Automation-specific fields
}

// models/connection.ts  
import { BaseEntity } from '../utils/base-types';
export interface Connection extends BaseEntity {
  // Connection-specific fields
}
```

**Issue 2: Complex Generic Constraints**
```typescript
// Problem: Generic type constraint too complex
type ComplexConstraint<T extends Record<string, unknown> & { id: string } & { created_at: Date }> = T;

// Solution: Use intersection types and named constraints
interface EntityRequirements {
  id: string;
  created_at: Date;
}

type ComplexConstraint<T extends Record<string, unknown> & EntityRequirements> = T;

// Or use composition
interface BaseEntity {
  id: string;
  created_at: Date;
}

type ComplexConstraint<T extends BaseEntity & Record<string, unknown>> = T;
```

**Issue 3: Platform-Specific Type Safety**
```typescript
// Problem: Need different types for different platforms but maintain type safety
function processAutomation(automation: Automation) {
  // How to handle platform-specific properties?
}

// Solution: Use discriminated unions
interface BaseAutomation {
  id: string;
  name: string;
}

interface SlackAutomation extends BaseAutomation {
  platform: 'slack';
  slackSpecific: {
    channelId: string;
    workspaceId: string;
  };
}

interface GoogleAutomation extends BaseAutomation {
  platform: 'google';
  googleSpecific: {
    scriptId: string;
    projectId: string;
  };
}

type Automation = SlackAutomation | GoogleAutomation;

function processAutomation(automation: Automation) {
  // TypeScript can discriminate based on platform field
  switch (automation.platform) {
    case 'slack':
      // automation is now SlackAutomation
      console.log(automation.slackSpecific.channelId);
      break;
    case 'google':
      // automation is now GoogleAutomation
      console.log(automation.googleSpecific.scriptId);
      break;
  }
}
```

### Performance Considerations

**Compile-Time Performance**:
- Keep interface definitions simple and focused
- Avoid deeply nested generic constraints
- Use type aliases for commonly used complex types
- Consider splitting large interface files into smaller modules

**Runtime Performance**:
- Types have no runtime overhead (stripped during compilation)
- Type guards should be optimized for common cases
- Cache type validation results when appropriate
- Use discriminated unions instead of runtime type checking

### Code Review Checklist

**Type Definition Review**:
- [ ] All interfaces have comprehensive JSDoc comments
- [ ] Required vs optional fields are correctly marked
- [ ] Platform-specific extensions use discriminated unions
- [ ] No use of 'any' type without justification
- [ ] Generic constraints are properly bounded
- [ ] Backward compatibility is maintained

**Integration Review**:
- [ ] New types are exported from appropriate modules
- [ ] Version number is properly incremented
- [ ] Breaking changes are documented
- [ ] Test coverage includes new type definitions
- [ ] API contracts match implementation expectations

---

## Migration and Upgrade Guide

### Migrating from Legacy Types

**Step 1: Identify Legacy Type Usage**
```bash
# Find all instances of legacy type definitions
grep -r "interface.*Connection" src/ --include="*.ts" --include="*.tsx"
grep -r "type.*Platform" src/ --include="*.ts" --include="*.tsx"
```

**Step 2: Install Shared Types Package**
```bash
npm install @saas-xray/shared-types@latest
```

**Step 3: Replace Legacy Imports**
```typescript
// Before: Local type definitions
interface Connection {
  id: string;
  platform: string;
}

// After: Shared type imports
import { PlatformConnection, Platform } from '@saas-xray/shared-types';
```

**Step 4: Update Implementation Code**
```typescript
// Before: Loose typing
function createConnection(data: any): any {
  return { id: generateId(), ...data };
}

// After: Strict typing with shared types
import { CreateConnectionRequest, PlatformConnection } from '@saas-xray/shared-types';

function createConnection(data: CreateConnectionRequest): Promise<PlatformConnection> {
  // Implementation with type safety
}
```

### Version Upgrade Process

**Minor Version Updates (1.5.0 → 1.6.0)**:
1. Update package.json dependency
2. Run type checking to identify new optional fields
3. Update implementation to use new features (optional)
4. Run tests to ensure compatibility

**Major Version Updates (1.6.0 → 2.0.0)**:
1. Review breaking changes documentation
2. Create migration branch
3. Update deprecated interface usage
4. Resolve breaking changes systematically
5. Update tests and validation
6. Deploy and monitor for runtime issues

### Automated Migration Tools

**TypeScript Migration Script**:
```typescript
// tools/migrate-types.ts
import * as ts from 'typescript';
import * as fs from 'fs';

interface MigrationRule {
  from: string;
  to: string;
  importFrom: string;
}

const migrationRules: MigrationRule[] = [
  {
    from: 'Connection',
    to: 'PlatformConnection',
    importFrom: '@saas-xray/shared-types'
  },
  {
    from: 'CreateConnectionReq',
    to: 'CreateConnectionRequest', 
    importFrom: '@saas-xray/shared-types'
  }
];

function migrateFile(filePath: string): void {
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );

  // Transform AST to replace legacy types
  const result = ts.transform(sourceFile, [createMigrationTransformer()]);
  
  // Write transformed file
  fs.writeFileSync(filePath, result.transformed[0].getFullText());
}

function createMigrationTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      // Transformation logic to replace type references
      return ts.visitEachChild(sourceFile, visitNode, context);
    };
  };
}
```

---

## Conclusion

The `@saas-xray/shared-types` package serves as the foundation for type safety across the SaaS X-Ray platform. By centralizing type definitions, enforcing API contracts, and providing extensible patterns for platform-specific implementations, it ensures consistency and reliability throughout the application stack.

The comprehensive architecture supports both current needs and future growth, with clear patterns for adding new platforms, extending existing interfaces, and maintaining backward compatibility. The combination of compile-time type safety and runtime validation provides confidence in both development and production environments.

Key benefits realized through this implementation:
- **Eliminated API Contract Drift**: Shared types ensure frontend and backend stay synchronized
- **Reduced Runtime Errors**: Compile-time type checking prevents entire classes of bugs
- **Enhanced Developer Experience**: Type completion and error detection improve productivity
- **Simplified Maintenance**: Centralized type definitions reduce duplication and inconsistency
- **Secure OAuth Implementation**: Type-safe credential handling prevents security vulnerabilities

The patterns and practices documented here provide a blueprint for maintaining and extending the type system as the SaaS X-Ray platform continues to evolve.

---

*Generated as part of Phase 3 TypeScript Migration Documentation*
*Last Updated: January 4, 2025*
# Generate API Command

Scaffold a new Express API endpoint with handler, contract, and tests using autonomous workflow.

## Workflow

1. **API Specification**
   - Endpoint name (e.g., `createCampaign`, `listProjects`)
   - HTTP method (GET, POST, PUT, DELETE)
   - Request/response shape
   - Location: `src/server/handlers/{domain}Handlers.ts`

2. **Automated Steps** (via Task tool)

   a. **Invoke `backend-architect` agent**
      - Generate Express route handler
      - Add Supabase integration if needed
      - Implement error handling
      - Follow project patterns (async/await, try/catch)
      - Output: Handler function in appropriate file

   b. **Add API Contract** (Zod schemas)
      - Request schema: `{name}RequestSchema`
      - Response schema: `{name}ResponseSchema`
      - Location: `src/lib/api/contracts.ts`
      - Strict type safety with Zod

   c. **Wire Route** in `src/server/app.ts`
      - Add Express route
      - Connect handler
      - Add error middleware

   d. **Invoke `test-automator` agent**
      - Generate integration tests
      - Test success and error cases
      - Mock Supabase if needed
      - Output: `src/server/handlers/{file}.test.ts`

   e. **Invoke `typescript-pro` agent**
      - Verify type safety
      - Check contract consistency
      - Validate request/response types

   f. **Invoke `code-reviewer-pro` agent** (Quality Gate)
      - Review API design
      - Check error handling
      - Verify security (auth, validation)
      - Approve or suggest improvements

3. **Auto-commit** (if approved)
   - Stage all changes
   - Commit: `feat: add {endpoint} API endpoint`

## Usage

```bash
/generate-api createCampaign POST
```

With full specification:
```bash
/generate-api createCampaign POST --request "name:string,budget:number" --response "id:string,status:string"
```

## Generated Files/Changes

```
src/server/handlers/
├── campaignHandlers.ts        # Handler implementation (updated)
└── campaignHandlers.test.ts   # Tests (updated)

src/lib/api/
└── contracts.ts                # Zod schemas (updated)

src/server/
└── app.ts                      # Route wiring (updated)
```

## Handler Template

```typescript
// src/server/handlers/campaignHandlers.ts
export const handleCreateCampaign = async (
  req: CreateCampaignRequest,
  { supabase }: { supabase: SupabaseClient<Database> }
): Promise<CreateCampaignResponse> => {
  // Validate request
  const validated = createCampaignRequestSchema.parse(req);

  try {
    // Call Supabase
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: validated.name,
        budget: validated.budget,
      })
      .select()
      .single();

    if (error) throw error;

    // Return typed response
    return createCampaignResponseSchema.parse({
      id: data.id,
      status: 'created',
    });
  } catch (error) {
    throw new Error(`Failed to create campaign: ${error.message}`);
  }
};
```

## Contract Template

```typescript
// src/lib/api/contracts.ts
export const createCampaignRequestSchema = z.object({
  name: z.string().min(1).max(100),
  budget: z.number().positive(),
  tenantId: z.string().uuid(),
});

export const createCampaignResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['created', 'pending', 'active']),
  createdAt: z.string().datetime(),
});

export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;
export type CreateCampaignResponse = z.infer<typeof createCampaignResponseSchema>;
```

## Route Wiring Template

```typescript
// src/server/app.ts
app.post('/api/campaigns', async (req, res, next) => {
  try {
    const result = await handleCreateCampaign(req.body, { supabase });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

## Test Template

```typescript
// src/server/handlers/campaignHandlers.test.ts
describe('handleCreateCampaign', () => {
  it('creates campaign successfully', async () => {
    const request: CreateCampaignRequest = {
      name: 'Test Campaign',
      budget: 1000,
      tenantId: 'test-tenant-id',
    };

    const result = await handleCreateCampaign(request, {
      supabase: mockSupabase,
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe('created');
  });

  it('throws error for invalid budget', async () => {
    const request = {
      name: 'Test',
      budget: -100, // Invalid
      tenantId: 'test-tenant-id',
    };

    await expect(
      handleCreateCampaign(request, { supabase: mockSupabase })
    ).rejects.toThrow();
  });
});
```

## Success Criteria

✅ Handler follows Express patterns
✅ Zod contracts for request/response
✅ Error handling implemented
✅ Integration tests cover success/failure
✅ TypeScript types are correct
✅ Code reviewer approves
✅ Pre-commit hook passes

## Options

**Skip tests** (not recommended):
```bash
/generate-api createCampaign POST --no-tests
```

**Skip route wiring**:
```bash
/generate-api createCampaign POST --handler-only
```

**Specify handler file**:
```bash
/generate-api createCampaign POST --file src/server/handlers/customHandlers.ts
```

## Authentication

For protected routes, add auth check:
```typescript
app.post('/api/campaigns', authenticateUser, async (req, res, next) => {
  try {
    const result = await handleCreateCampaign(req.body, {
      supabase,
      userId: req.user.id,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

## Notes

- All endpoints use Zod validation
- Supabase client passed via dependency injection
- Error handling via Express middleware
- Tests use supertest for HTTP testing
- Contracts exported for frontend use
- Auto-imported in `src/lib/api/client.ts`

# Quick Test Reference - Google Workspace OAuth Enrichment

## Pre-Test Cleanup (RECOMMENDED)
```bash
# Delete old ChatGPT automation to force fresh creation
docker exec singura-postgres-1 psql -U postgres -d singura -c "DELETE FROM discovered_automations WHERE name = 'ChatGPT';"
```

## Test Steps (5 minutes)

1. **Open App**: http://localhost:4200
2. **Go to Connections** → Find Google Workspace → Click "Start Discovery"
3. **Wait 30-60 seconds** for completion
4. **Go to Automations** → Find ChatGPT → Verify HIGH risk badge (red)
5. **Click ChatGPT** → Verify permissions show names (not "Unknown")

## Database Verification
```bash
# Check permissions populated
docker exec singura-postgres-1 psql -U postgres -d singura -c "
SELECT name, jsonb_array_length(permissions_required) as perm_count 
FROM discovered_automations WHERE name = 'ChatGPT';"

# Expected: perm_count = 4 (not 0)

# Check risk assessment
docker exec singura-postgres-1 psql -U postgres -d singura -c "
SELECT risk_level, risk_score FROM risk_assessments 
WHERE automation_id = (SELECT id FROM discovered_automations WHERE name = 'ChatGPT' LIMIT 1);"

# Expected: risk_level = 'high', risk_score ~85
```

## Monitor Discovery Logs
```bash
docker logs -f singura-backend-1 --tail 50 | grep -E "OAuth|ChatGPT|discovery"
```

## Success Checklist
- [ ] ChatGPT shows HIGH risk badge (red) in list
- [ ] Details show "Full Drive Access", "Email Address", etc. (not "Unknown")
- [ ] Database permissions_required has 4 scopes
- [ ] Database risk_level = 'high'

## Full Report
See: /Users/darrenmorgan/AI_Projects/singura/QA_TEST_REPORT_OAUTH_ENRICHMENT.md

# OAuth App View Details Enhancement - Research Index

**Research completed**: 2025-10-07  
**Status**: ✅ Complete - Ready for implementation

---

## 📚 Documentation Suite

### 1. **Comprehensive Research Report** 
📄 [`GOOGLE_OAUTH_APP_VIEW_DETAILS_ENHANCEMENT.md`](./GOOGLE_OAUTH_APP_VIEW_DETAILS_ENHANCEMENT.md)

**Purpose**: Complete deep-dive research into Google Workspace API capabilities  
**Contents**:
- Admin Reports API: Token events, usage tracking, activity timeline
- Admin Directory API: Token metadata, user context enrichment
- Drive Activity API: File access tracking (requires new scope)
- Comprehensive OAuth scope risk library (20+ scopes)
- Implementation roadmap (3 phases)
- UI/UX recommendations
- Code examples and API queries

**Read this if**: You need comprehensive understanding of all available metadata sources

---

### 2. **Quick Reference Guide**
📄 [`OAUTH_VIEW_DETAILS_QUICK_REF.md`](./OAUTH_VIEW_DETAILS_QUICK_REF.md)

**Purpose**: TL;DR version with actionable checklists  
**Contents**:
- What we CAN add (no new scopes)
- What we CANNOT add
- OAuth scope risk library (JSON format)
- Implementation checklist
- API query examples
- Testing strategy

**Read this if**: You want quick answers and copy-paste snippets

---

### 3. **Implementation Guide**
📄 [`OAUTH_VIEW_DETAILS_IMPLEMENTATION.md`](./OAUTH_VIEW_DETAILS_IMPLEMENTATION.md)

**Purpose**: Ready-to-implement code and SQL  
**Contents**:
- Complete database migration SQL
- TypeScript type definitions
- Service implementations (Directory, Enrichment)
- API endpoint code
- React component example
- Testing examples
- Deployment checklist

**Read this if**: You're ready to implement Phase 1 (8-16 hours)

---

## 🎯 Executive Summary

### What We Discovered

**Available Today (No New OAuth Scopes):**
- ✅ Token metadata (native app flag, verification status)
- ✅ User context (admin role, department, org unit)
- ✅ Usage statistics (event counts, trends, peak days)
- ✅ Activity timeline (authorization, revocation, API access events)
- ✅ Scope evolution (historical scope changes)
- ✅ Access patterns (IP addresses, time-of-day analysis)
- ✅ Enhanced scope descriptions (risk levels, abuse scenarios, alternatives)

**Requires New Scopes (Defer to Phase 3):**
- ⚠️ Drive Activity API (file access tracking)
- ⚠️ Requires `drive.activity.readonly` scope
- ⚠️ High implementation effort, low MVP priority

### Key Findings

**1. OAuth Scope Risk Library**
Created comprehensive library of 15+ Google OAuth scopes with:
- Risk scores (0-100)
- Risk levels (LOW/MEDIUM/HIGH/CRITICAL)
- Access descriptions
- Potential abuse scenarios
- Alternative recommendations
- GDPR/compliance impact

**2. Enhanced Metadata Sources**

| API | What We Get | Implementation |
|-----|-------------|----------------|
| Admin Reports API | Token events, usage stats, activity timeline | MEDIUM (aggregation) |
| Admin Directory API | Token metadata, user context | LOW (single API call) |
| Scope Library | Risk analysis, descriptions, alternatives | LOW (database lookup) |

**3. Implementation Phases**

**Phase 1: Quick Wins (8-16 hours)** ⭐ PRIORITY
- Scope risk library (database + seed data)
- Directory API integration
- User context enrichment
- Basic metadata enhancement

**Phase 2: Analytics (16-24 hours)**
- Usage frequency statistics
- Activity timeline builder
- Access pattern analysis
- Scope evolution tracking

**Phase 3: Advanced (1-2 weeks)** - DEFER
- Drive Activity API
- File access tracking
- ML anomaly detection

---

## 🚀 Implementation Plan

### Phase 1 Tasks (Week 1)

**Database (2-3 hours)**
- [ ] Create `oauth_scope_library` table
- [ ] Seed with 15 Google OAuth scopes
- [ ] Add indexes for performance

**Backend Services (4-6 hours)**
- [ ] Implement `GoogleDirectoryService`
- [ ] Implement `OAuthScopeEnrichmentService`
- [ ] Update discovery flow to capture new metadata
- [ ] Create `/api/automations/:id/details` endpoint

**Shared Types (1-2 hours)**
- [ ] Add `OAuthAppDetails` interface
- [ ] Add `EnrichedOAuthScope` interface
- [ ] Add user context types

**Testing (2-3 hours)**
- [ ] Unit tests for enrichment service
- [ ] Integration tests for details endpoint
- [ ] E2E test for View Details modal

**Frontend (3-4 hours)**
- [ ] Create `AutomationDetailsModal` component
- [ ] Implement 4-tab layout (Overview, Permissions, Activity, Risk)
- [ ] Connect to API endpoint
- [ ] Add loading/error states

**Total Effort**: 12-18 hours

### Success Criteria

✅ View Details modal shows:
- Application type (native vs web)
- Verification status
- Authorizer details (name, role, department)
- Enhanced scope descriptions with risk levels
- GDPR compliance concerns
- Actionable recommendations

✅ Technical:
- No new OAuth scopes required
- All data from existing APIs
- Properly typed in shared-types
- 80%+ test coverage

---

## 📊 Expected Results

### Before Enhancement
```
View Details:
- Name: ChatGPT
- Platform: Google
- Risk: High
- Created: Sep 14, 2025
- Scopes: 4 scopes (URLs only)
```

### After Phase 1 Enhancement
```
View Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 OVERVIEW
├─ Application: ChatGPT (OpenAI)
├─ Type: Web Application
├─ Status: ⚠️ Unverified
├─ Client ID: 77377267392-xxx.apps.googleusercontent.com
├─ First Authorized: Sep 14, 2025 (22 days ago)
└─ Authorized By: Darren Morgan (darren@baliluxurystays.com)
    └─ ⚠️ Admin User | Engineering Department

🔒 PERMISSIONS (4 scopes)

HIGH RISK (1 scope)
├─ https://www.googleapis.com/auth/drive.readonly
│  ├─ Service: Google Drive
│  ├─ Access: Read-only to ALL files and folders
│  ├─ Risk Score: 65/100
│  ├─ Description: Can access all documents, including shared items
│  ├─ ⚠️ Potential Abuse: Data exfiltration, IP theft
│  └─ 💡 Alternative: drive.metadata.readonly

LOW RISK (3 scopes)
├─ userinfo.email (Risk: 10/100)
├─ userinfo.profile (Risk: 10/100)
└─ openid (Risk: 5/100)

⚠️ RISK ANALYSIS

Overall Risk Score: 72/100 (HIGH)

Risk Breakdown:
├─ AI Platform Integration: 30 points
├─ High-Privilege Scopes: 15 points (drive.readonly)
├─ Admin User Authorization: 10 points
└─ Usage Patterns: 7 points

GDPR Concerns:
├─ May process personal data from Drive files
├─ Third-party data processor (OpenAI)
└─ Data residency unknown

Recommendations:
1. Review scope necessity - consider drive.metadata.readonly
2. Implement data classification for Drive files
3. Add DPA with OpenAI
4. Enable audit logging
```

---

## 🔗 Related Documentation

**Project Documentation:**
- Main research: [GOOGLE_OAUTH_METADATA_RESEARCH.md](./GOOGLE_OAUTH_METADATA_RESEARCH.md) (previous research)
- Architecture: [../../.claude/ARCHITECTURE.md](../../.claude/ARCHITECTURE.md)
- OAuth pitfalls: [../../.claude/PITFALLS.md](../../.claude/PITFALLS.md)

**Implementation Files:**
- Current metadata: `backend/src/services/google-api-client-service.ts`
- Discovery: `backend/src/connectors/google.ts`
- AI detection: `backend/src/services/detection/google-oauth-ai-detector.service.ts`

**External Resources:**
- [Google Admin SDK: Reports API](https://developers.google.com/admin-sdk/reports)
- [Google Admin SDK: Directory API](https://developers.google.com/admin-sdk/directory)
- [Google OAuth Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

---

## 📈 Impact & Value

### User Experience
- **Before**: Basic OAuth app info (name, scopes, risk level)
- **After**: Comprehensive security intelligence with actionable insights

### Compliance
- **Before**: Limited audit evidence
- **After**: Complete scope risk analysis, GDPR impact assessment, recommendations

### Differentiation
- **Before**: Similar to competitor tools
- **After**: Unique scope risk library, detailed authorization context, compliance focus

### Time to Value
- **Phase 1**: 8-16 hours → Immediate UX improvement
- **Phase 2**: 16-24 hours → Analytics and insights
- **Phase 3**: 1-2 weeks → Advanced features (defer)

---

## ❓ FAQ

**Q: Do we need new OAuth scopes?**  
A: NO for Phase 1-2. Drive Activity API (Phase 3) requires new scope.

**Q: What's the implementation effort?**  
A: Phase 1: 8-16 hours. Phase 2: 16-24 hours. Phase 3: 1-2 weeks (defer).

**Q: What's the biggest value-add?**  
A: OAuth scope risk library with detailed descriptions, abuse scenarios, and alternatives.

**Q: Can we track file access by OAuth apps?**  
A: Not with current scopes. Requires `drive.activity.readonly` (Phase 3, defer).

**Q: How do we get "last used" timestamp?**  
A: Google doesn't provide this. We approximate with "last activity event" from audit logs.

**Q: What about Slack and Microsoft?**  
A: This research is Google-specific. Slack/Microsoft have different APIs but similar concepts.

---

**Status**: ✅ Research Complete | 📋 Ready for Implementation | ⭐ Recommend Phase 1 Start

**Next Steps**: 
1. Review with team
2. Prioritize Phase 1 implementation
3. Create implementation ticket/PR
4. Assign developer
5. Target completion: 1 week

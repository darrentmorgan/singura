# Singura API Reference

## 🌐 API Overview
Base URL: `https://api.singura.com/v1`

## 🔐 Authentication
All endpoints require OAuth 2.0 authentication with platform-specific tokens.

### OAuth Flow Endpoints
- `POST /oauth/connect/{platform}`: Initiate OAuth connection
- `GET /oauth/refresh`: Refresh access tokens
- `DELETE /oauth/disconnect/{platform}`: Revoke platform access

## 🕵️ Detection API

### Automation Discovery
- `GET /detections/discover`
  - Discovers shadow network automations
  - Returns: Detected automation events with risk scoring

### Risk Assessment
- `GET /risk/evaluate`
  - Comprehensive risk evaluation for detected automations
  - Parameters:
    - `platform`: Target SaaS platform
    - `scope`: Detection scope (organization/workspace)

## 📊 Real-Time Monitoring

### WebSocket Events
- `automation:discovered`: New automation detected
- `risk:updated`: Risk score changes
- `compliance:alert`: Compliance violation detected

## 🔍 Platform Connectors

### Google Workspace Connector
- `GET /connectors/google/automations`
- `GET /connectors/google/permissions`

### Slack Connector
- `GET /connectors/slack/workflows`
- `GET /connectors/slack/app-inventory`

## 📋 Audit & Compliance

### Audit Logs
- `GET /audit/logs`
  - Retrieve comprehensive audit trail
  - Supports filtering, pagination

### Compliance Reports
- `GET /compliance/report`
  - Generate GDPR-compliant detection reports
  - Export formats: PDF, CSV

## 🧪 Examples

### Detect Automations
```typescript
// TypeScript example using shared types
import { DetectionRequest, DetectionResponse } from '@singura/shared-types';

const detectAutomations = async (platform: string): Promise<DetectionResponse> => {
  const request: DetectionRequest = {
    platform,
    scope: 'organization'
  };

  const response = await saasXrayClient.detect(request);
  return response;
};
```

## 🚨 Error Handling
Standard error response structure:
```typescript
interface APIError {
  code: string;
  message: string;
  timestamp: Date;
  correlationId: string;
}
```

## 📦 SDK Availability
- TypeScript/JavaScript SDK available
- REST API with comprehensive documentation
- WebSocket real-time event streaming
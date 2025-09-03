# SaaS X-Ray Data Toggle Feature

## Overview

The data toggle feature allows seamless switching between mock data (for demos) and real data (for production) without code changes or server restarts. This is perfect for:

- **Live demos** where you need to switch between demo data and real discovery
- **Development** where you don't always have OAuth credentials set up
- **Testing** different scenarios without complex setup

## 🚀 Quick Start

### Backend Setup

1. **Environment Variables** (already configured in `.env`):
```env
USE_MOCK_DATA=true          # Default to mock data
ENABLE_DATA_TOGGLE=true     # Allow runtime switching
```

2. **Start the Test Server**:
```bash
cd backend
node test-data-toggle.js
```

### Frontend Integration

**Check Data Mode**:
```javascript
const response = await fetch('/api/config/data-mode');
const config = await response.json();
console.log(config.usingMockData); // true/false
```

**Toggle Data Source**:
```javascript
// Use mock data
fetch('/api/connections/conn-2/discover', {
  method: 'POST',
  headers: { 'X-Use-Mock-Data': 'true' }
});

// Use real data (will fallback to mock if not configured)
fetch('/api/connections/conn-2/discover', {
  method: 'POST', 
  headers: { 'X-Use-Mock-Data': 'false' }
});
```

## 📊 Mock Data Features

### AI-Focused Automations
The mock data now specifically targets comprehensive AI automation discovery with 5 realistic scenarios:

**1. AI Customer Support Bot** (Critical - Score: 92):
- **Risk Level**: Critical
- **AI Provider**: OpenAI GPT-4
- **Permissions**: Slack channels, files, direct messages
- **Risk Factors**: Customer PII processing, unfiltered AI responses, prompt injection vulnerabilities

**2. Claude Financial Data Analyzer** (Critical - Score: 88):
- **Risk Level**: Critical  
- **AI Provider**: Anthropic Claude
- **Permissions**: Google Sheets, Drive, financial data access
- **Risk Factors**: Revenue data to external AI, unencrypted data transmission, regulatory compliance risks

**3. AI Meeting Intelligence System** (Critical - Score: 96):
- **Risk Level**: Critical
- **AI Provider**: OpenAI Whisper + GPT-4
- **Permissions**: Teams meetings, calendar, email
- **Risk Factors**: C-suite confidential discussions, no participant consent, strategic intelligence exposure

**4. AI Document Intelligence Pipeline** (Critical - Score: 94):
- **Risk Level**: Critical
- **AI Provider**: Multi-AI (OpenAI + Anthropic + Cohere)
- **Permissions**: Google Drive, Docs, Gmail
- **Risk Factors**: HR/legal documents, employee PII, multi-provider data replication

**5. AI Content Generation Bot** (High - Score: 76):
- **Risk Level**: High
- **AI Provider**: OpenAI GPT-3.5
- **Permissions**: Slack channels, file access
- **Risk Factors**: Unvetted public content, brand reputation risk, marketing strategy exposure

### Enhanced Risk Assessment
- **Overall Risk Score**: 89 (up from 71 - reflects critical AI exposure)
- **Critical-Risk Indicators**: 4 out of 5 automations process sensitive data through external AI
- **AI Provider Breakdown**: OpenAI (4), Anthropic (2), Cohere (1)
- **GDPR Concerns**: All automations involve automated processing of PII or confidential data

## 🎯 Demo Usage

### For Business Partner Meeting

1. **Start with Mock Data** (default):
   - Shows impressive AI automation discovery
   - Demonstrates risk assessment capabilities
   - No OAuth setup required

2. **Show Real Data Attempt**:
   - Switch to real data mode
   - Shows graceful fallback to mock when OAuth not configured
   - Demonstrates production-ready error handling

3. **Key Talking Points**:
   - "This shows 5 AI automations we discovered - all with critical security risks"
   - "We can detect when customer PII is being sent to ChatGPT, Claude, and other AI services"
   - "Notice the 96 risk score on the meeting bot - it's processing C-suite discussions through OpenAI"
   - "The financial analyzer is sending revenue data directly to Anthropic's Claude"
   - "These are real patterns we see - employees connecting AI without IT knowledge"

### Demo Commands

```bash
# Check current configuration
curl http://localhost:3001/api/config/data-mode

# Test mock data discovery
curl -H "X-Use-Mock-Data: true" -X POST \
  http://localhost:3001/api/connections/conn-2/discover

# Test real data fallback
curl -H "X-Use-Mock-Data: false" -X POST \
  http://localhost:3001/api/connections/conn-2/discover
```

## 🔧 Technical Implementation

### API Endpoints

**Data Mode Configuration**:
- `GET /api/config/data-mode` - Returns current data mode settings
- Response includes `usingMockData`, `dataToggleEnabled`, `environment`

**Data Toggle Header**:
- `X-Use-Mock-Data: true|false` - Override default data source
- Works on all discovery endpoints
- Graceful fallback to mock on real data errors

### Data Provider Pattern

```javascript
// Abstract interface
class DataProvider {
  getConnections()
  discoverAutomations(connectionId) 
}

// Mock implementation
class MockDataProvider extends DataProvider {
  // Returns AI-focused demo data
}

// Real implementation  
class RealDataProvider extends DataProvider {
  // Calls actual Google APIs (requires OAuth)
}

// Factory function
function getDataProvider(useMockData) {
  return useMockData ? new MockDataProvider() : new RealDataProvider();
}
```

## 🎨 Frontend Integration Ideas

### Settings Panel Toggle
```jsx
function DataModeToggle() {
  const [useMockData, setUseMockData] = useState(true);
  
  const toggleDataMode = () => {
    setUseMockData(!useMockData);
    // Store in localStorage
    localStorage.setItem('use-mock-data', String(!useMockData));
  };

  return (
    <div className="flex items-center space-x-2">
      <span>Demo Mode</span>
      <Switch checked={useMockData} onCheckedChange={toggleDataMode} />
      <span>Real Data</span>
    </div>
  );
}
```

### Visual Indicator
```jsx
function DemoModeBanner({ isUsingMockData }) {
  if (!isUsingMockData) return null;
  
  return (
    <div className="bg-yellow-100 border-yellow-400 text-yellow-800 px-4 py-2 border-l-4">
      🎭 Demo Mode - Using Mock Data for AI Automation Discovery
    </div>
  );
}
```

### API Client with Toggle
```javascript
class APIClient {
  constructor(useMockData = false) {
    this.useMockData = useMockData;
  }
  
  async discoverAutomations(connectionId) {
    const response = await fetch(`/api/connections/${connectionId}/discover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Mock-Data': String(this.useMockData)
      }
    });
    
    return response.json();
  }
}
```

## ✅ Benefits

### For Demos
- **No OAuth Setup**: Demo immediately without complex API credentials
- **Consistent Data**: Same impressive results every time
- **Fast Performance**: No real API calls, instant responses
- **Risk-Free**: No actual data exposure during presentations

### For Development
- **Faster Iteration**: Test UI changes without API dependencies
- **Offline Development**: Work without internet connectivity
- **Error Testing**: Simulate various API failure scenarios
- **Cost Savings**: Reduce API quota usage during development

### for Production
- **Graceful Degradation**: Real data with automatic fallback to mock
- **A/B Testing**: Compare mock vs real data results
- **Demo Environments**: Production deployments with demo mode
- **Support Debugging**: Enable demo mode to isolate issues

## 🚨 Important Notes

1. **Security**: Mock data contains no real PII or sensitive information
2. **Fallback**: Real data mode automatically falls back to mock on errors
3. **Configuration**: Toggle can be disabled in production via `ENABLE_DATA_TOGGLE=false`
4. **Performance**: Mock data responds instantly, real data may take 2-5 seconds
5. **Scope**: Currently implemented for Google Workspace discovery, expandable to other platforms

## 🎯 Future Enhancements

- **Frontend Toggle UI**: Settings panel with visual switch
- **Data Mixing**: Combine real and mock data for enhanced demos  
- **Custom Scenarios**: Multiple mock datasets for different demo scenarios
- **Real-time Sync**: Update mock data based on real API responses
- **Audit Trail**: Log when mock vs real data is used

---

**Ready to demo!** The data toggle feature gives you professional flexibility to switch between impressive demo data and real production discovery without any technical complexity during your business partner meeting. 🚀
---
status: pending
priority: p2
issue_id: "003"
tags: [revenue-enabler, frontend, dashboard, charts, executive]
dependencies: []
estimated_effort: large
---

# Build Executive Dashboard with Trend Charts and Risk Visualizations

## Problem Statement

Current dashboard shows only basic stats (connection count, active/error status). Enterprise customers and executives require board-ready visualizations with trend analysis, risk benchmarking, and platform breakdowns to justify security investments and demonstrate ROI.

**Discovered during**: Compounding Engineering comprehensive code review (2025-10-16)

**PRD Reference**: `docs/PRD.md` Epic 2.1 (lines 50-65)
> **User Story 2.1**: As a CISO presenting to leadership, I want to visualize risk scores and trends so that I can demonstrate security posture improvements

**Business Impact**:
- No board-ready metrics limits C-level buy-in
- Prevents trending analysis for risk improvements
- Reduces perceived product value
- Blocks executive tier pricing justification

**Success Metrics** (from PRD):
- Average contract value increase: +67%
- Executive buyer engagement: +40%
- Contract renewal probability: +25%

## Current State

**Implemented**:
- Basic connection stats (total, active, errors)
- Simple automation count
- Recharts library installed (`package.json`)

**Missing**:
1. **Risk Trend Charts** - 30/60/90 day risk score evolution
2. **Platform Usage Breakdown** - Pie/bar charts showing automation distribution
3. **Automation Growth Over Time** - Line charts tracking discovery trends
4. **Top Risks Dashboard** - Sortable table with drill-down capabilities
5. **Comparative Benchmarking** - Industry average comparisons
6. **Real-time Updates** - WebSocket integration for live metrics

## Proposed Solutions

### Option 1: Comprehensive Executive Dashboard (RECOMMENDED)
**Scope**: Full dashboard with 6 chart types + real-time updates

**Components**:
1. **Risk Trend Analysis**
   - Multi-line chart: Overall risk, by platform, by type
   - 30/60/90 day time windows
   - Risk score evolution visualization

2. **Platform Distribution**
   - Pie chart: Automations by platform (Slack, Google, Microsoft)
   - Bar chart: Risk levels by platform
   - Stacked area: Platform growth over time

3. **Automation Timeline**
   - Line chart: Discovery trends (daily, weekly, monthly)
   - Area chart: Active vs. inactive automations
   - Sparklines: Quick trend indicators

4. **Risk Heatmap**
   - Grid view: Risk by platform + type
   - Color coding: Green/yellow/red risk levels
   - Interactive drill-down

5. **Top Risks Table**
   - Sortable by risk score, platform, date
   - Expandable rows for details
   - Quick actions (view details, remediate)

6. **Executive Summary Cards**
   - KPI cards: Total risk reduction, automations discovered, platforms monitored
   - Trend indicators: ↑↓ changes from previous period
   - Action items: High-risk automations requiring attention

**Pros**:
- Complete solution meeting all PRD requirements
- Board-ready visualizations
- Supports enterprise sales
- Enables data-driven security decisions

**Cons**:
- Higher implementation effort
- Requires backend time-series queries

**Effort**: Large (5-7 days)
**Risk**: Medium (complex chart integrations)

### Option 2: Basic Charts Only
**Scope**: 3 simple charts (pie, bar, line)

**Pros**: Faster implementation (2-3 days)
**Cons**: Doesn't meet PRD requirements, not enterprise-grade

**Effort**: Medium (2-3 days)
**Risk**: Low

## Recommended Action

**Choose Option 1** - Build comprehensive executive dashboard for enterprise readiness

## Implementation Steps

### Phase 1: Backend Time-Series Data (Day 1-2)

#### 1.1 Create Analytics Service
**File**: `backend/src/services/analytics-service.ts`

```typescript
export class AnalyticsService {
  async getRiskTrendData(
    organizationId: string,
    timeWindow: '30d' | '60d' | '90d'
  ): Promise<RiskTrendDataPoint[]> {
    // Query automation snapshots over time
    // Aggregate risk scores by day/week
    // Return time-series data
  }

  async getPlatformDistribution(organizationId: string): Promise<PlatformStats[]> {
    // Count automations by platform
    // Calculate risk levels per platform
  }

  async getAutomationGrowth(
    organizationId: string,
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Promise<GrowthDataPoint[]> {
    // Track automation discovery over time
    // Return cumulative and incremental counts
  }

  async getTopRisks(
    organizationId: string,
    limit: number = 10
  ): Promise<AutomationRiskSummary[]> {
    // Return highest risk automations
    // Include platform, type, score, recent activity
  }
}
```

#### 1.2 Add Analytics Endpoints
**File**: `backend/src/routes/analytics.ts`

```typescript
router.get('/analytics/risk-trends', requireAuth, async (req, res) => {
  const { timeWindow = '30d' } = req.query;
  const data = await analyticsService.getRiskTrendData(
    req.auth.organizationId,
    timeWindow
  );
  res.json({ success: true, data });
});

router.get('/analytics/platform-distribution', requireAuth, async (req, res) => {
  const data = await analyticsService.getPlatformDistribution(req.auth.organizationId);
  res.json({ success: true, data });
});
```

#### 1.3 Add Database Indexes for Performance
```sql
-- Migration: Add analytics query indexes
CREATE INDEX idx_automations_created_at ON automations(organization_id, created_at);
CREATE INDEX idx_automations_risk_score ON automations(organization_id, risk_score DESC);
CREATE INDEX idx_automations_platform ON automations(organization_id, platform);
```

### Phase 2: Chart Components (Day 3-4)

#### 2.1 Risk Trend Chart
**File**: `frontend/src/components/analytics/RiskTrendChart.tsx`

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const RiskTrendChart: React.FC<{
  data: RiskTrendDataPoint[];
  timeWindow: '30d' | '60d' | '90d';
}> = ({ data, timeWindow }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Trend Analysis</CardTitle>
        <CardDescription>Risk score evolution over {timeWindow}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="overallRisk" stroke="#ef4444" name="Overall Risk" />
            <Line type="monotone" dataKey="slackRisk" stroke="#4f46e5" name="Slack" />
            <Line type="monotone" dataKey="googleRisk" stroke="#10b981" name="Google" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

#### 2.2 Platform Distribution Chart
**File**: `frontend/src/components/analytics/PlatformDistributionChart.tsx`

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export const PlatformDistributionChart: React.FC<{
  data: PlatformStats[];
}> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

#### 2.3 Automation Growth Chart
**File**: `frontend/src/components/analytics/AutomationGrowthChart.tsx`

```typescript
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AutomationGrowthChart: React.FC<{
  data: GrowthDataPoint[];
}> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Discovery Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="cumulative" stackId="1" stroke="#4f46e5" fill="#4f46e5" name="Total Discovered" />
            <Area type="monotone" dataKey="active" stackId="2" stroke="#10b981" fill="#10b981" name="Active" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

### Phase 3: Dashboard Integration (Day 5-6)

#### 3.1 Enhanced Dashboard Page
**File**: `frontend/src/pages/DashboardPage.tsx`

```typescript
export const DashboardPage: React.FC = () => {
  const [riskTrendData, setRiskTrendData] = useState<RiskTrendDataPoint[]>([]);
  const [platformData, setPlatformData] = useState<PlatformStats[]>([]);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [timeWindow, setTimeWindow] = useState<'30d' | '60d' | '90d'>('30d');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeWindow]);

  const loadAnalyticsData = async () => {
    const [risks, platforms, growth] = await Promise.all([
      analyticsApi.getRiskTrends(timeWindow),
      analyticsApi.getPlatformDistribution(),
      analyticsApi.getAutomationGrowth('daily')
    ]);
    setRiskTrendData(risks);
    setPlatformData(platforms);
    setGrowthData(growth);
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Total Risk Reduction" value="42%" trend="down" />
        <KPICard title="Automations Discovered" value={stats.total} trend="up" />
        <KPICard title="High Risk Items" value={stats.highRisk} trend="down" />
      </div>

      {/* Time Window Selector */}
      <Tabs value={timeWindow} onValueChange={setTimeWindow}>
        <TabsList>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
          <TabsTrigger value="60d">60 Days</TabsTrigger>
          <TabsTrigger value="90d">90 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskTrendChart data={riskTrendData} timeWindow={timeWindow} />
        <PlatformDistributionChart data={platformData} />
        <AutomationGrowthChart data={growthData} />
        <TopRisksTable automations={topRisks} />
      </div>
    </div>
  );
};
```

### Phase 4: Testing & Optimization (Day 7)

#### 4.1 Performance Testing
```typescript
// backend/src/services/analytics-service.test.ts
describe('AnalyticsService Performance', () => {
  it('should load 90-day risk trends in <500ms', async () => {
    const start = Date.now();
    await analyticsService.getRiskTrendData('org-123', '90d');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle 10,000 automations without timeout', async () => {
    // Seed 10k automations
    await analyticsService.getPlatformDistribution('large-org');
    // Should complete without error
  });
});
```

#### 4.2 Component Tests
```typescript
// frontend/src/components/analytics/RiskTrendChart.test.tsx
describe('RiskTrendChart', () => {
  it('should render chart with data points', () => {
    render(<RiskTrendChart data={mockData} timeWindow="30d" />);
    expect(screen.getByText('Risk Trend Analysis')).toBeInTheDocument();
  });

  it('should show loading state while fetching data', () => {
    render(<RiskTrendChart data={[]} timeWindow="30d" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

## Technical Details

**New Files to Create**:
- `backend/src/services/analytics-service.ts` - Analytics data aggregation
- `backend/src/routes/analytics.ts` - API endpoints
- `frontend/src/components/analytics/RiskTrendChart.tsx`
- `frontend/src/components/analytics/PlatformDistributionChart.tsx`
- `frontend/src/components/analytics/AutomationGrowthChart.tsx`
- `frontend/src/components/analytics/TopRisksTable.tsx`
- `frontend/src/components/analytics/KPICard.tsx`
- `frontend/src/services/analytics-api.ts` - API client

**Modified Files**:
- `frontend/src/pages/DashboardPage.tsx` - Integrate charts
- `backend/src/simple-server.ts` - Register analytics routes

**Database Changes**:
- Add indexes for analytics query performance
- Consider materialized views for large datasets

## Acceptance Criteria

- [ ] Risk trend chart displays 30/60/90 day data accurately
- [ ] Platform distribution chart shows all connected platforms
- [ ] Automation growth chart tracks discovery trends
- [ ] All charts responsive on mobile/tablet/desktop
- [ ] Charts render in <1s with 1000 automations
- [ ] Time window selector updates all charts
- [ ] Export dashboard as PDF (integrate with Finding #4)
- [ ] Real-time updates via WebSocket
- [ ] 80%+ test coverage for analytics service
- [ ] E2E test verifies full dashboard load

## Delegation Strategy

**Agent**: `react-clerk-expert`
**Why**: Frontend specialist for React component development and chart integration

**Supporting Agent**: `database-optimizer`
**Why**: Backend query optimization for analytics performance

**MCP Access**: None required

**Task Prompts**:

**For react-clerk-expert**:
```
Build executive dashboard with Recharts visualizations.

Create:
1. RiskTrendChart, PlatformDistributionChart, AutomationGrowthChart components
2. Enhanced DashboardPage with chart grid layout
3. KPI cards with trend indicators
4. Responsive design for mobile/tablet/desktop

Use Recharts library, shadcn/ui Card components, follow existing patterns.
```

**For database-optimizer**:
```
Optimize analytics queries for dashboard performance.

Create:
1. Analytics service with time-series aggregations
2. Database indexes for query performance
3. API endpoints with caching
4. Performance tests ensuring <500ms response

Target: Support 10,000 automations without performance degradation.
```

## Compounding Benefits

### Reusable Chart Components
- Time-series line charts for any metric
- Distribution pie charts for categorical data
- Growth area charts for trending analysis
- Sortable tables with drill-down

### Analytics Infrastructure
- Time-series data aggregation patterns
- Query optimization for large datasets
- Real-time update mechanisms
- Export integration (PDF dashboards)

### Documentation to Create

Add to `.claude/PATTERNS.md`:
```markdown
## Dashboard Chart Patterns

Recharts integration:
- Responsive containers for all chart sizes
- Consistent color palette across charts
- Loading states during data fetch
- Error boundaries for chart failures

Example:
\`\`\`typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="risk" stroke="#ef4444" />
  </LineChart>
</ResponsiveContainer>
\`\`\`
```

## Testing Strategy

### Unit Tests
- Analytics service data transformation
- Chart component rendering
- KPI card calculations
- Date range filtering

### Integration Tests
- Analytics API endpoints
- Data aggregation accuracy
- Time window queries
- Real-time updates

### Component Tests
- Chart interaction (zoom, pan, tooltip)
- Responsive layout
- Loading states
- Error handling

### E2E Tests
- Full dashboard load
- Time window switching
- Chart drill-down
- Export dashboard

## Work Log

### 2025-10-16 - Code Review Discovery
**By:** Compounding Engineering Review System
**Actions:**
- Identified as P2 revenue enabler
- Categorized as executive engagement blocker
- Estimated 5-7 days effort

**Learnings**:
- Executive dashboards critical for C-level buy-in
- Chart library already installed (Recharts)
- Analytics infrastructure provides compounding value

## Notes

**Source**: Compounding Engineering review performed on 2025-10-16
**Review Command**: `/compounding-engineering:review .claude/prompts/compounding-remediation.md`

**Related Findings**:
- Finding #5 from comprehensive review
- Enables export to PDF (Finding #4)
- Supports enterprise tier pricing
- Aligns with PRD Epic 2.1

**Business Value**: +67% average contract value increase (per PRD)

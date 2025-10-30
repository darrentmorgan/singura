# False Positive / False Negative Analysis Report

Generated: 2025-10-30T02:12:18.430Z

## Summary Statistics

- **Total False Positives**: 10
- **Total False Negatives**: 3
- **False Positive Rate**: 20.41%
- **False Negative Rate**: 5.88%
- **True Positives**: 48
- **True Negatives**: 39

## Top 5 False Positives (Highest Confidence)

### slack-bot-072
- **Platform**: slack
- **Detector**: ai-provider-detector
- **Confidence**: 69.0%
- **Analysis**: Low velocity score (0.29) should reduce suspicion; Normal business hours activity pattern flagged incorrectly; AI provider detector triggered despite no AI integration detected

### slack-bot-045
- **Platform**: slack
- **Detector**: ai-provider-detector
- **Confidence**: 68.4%
- **Analysis**: Low velocity score (0.32) should reduce suspicion; Normal business hours activity pattern flagged incorrectly; AI provider detector triggered despite no AI integration detected

### slack-bot-096
- **Platform**: slack
- **Detector**: ai-provider-detector
- **Confidence**: 68.2%
- **Analysis**: Low velocity score (0.3) should reduce suspicion; Normal business hours activity pattern flagged incorrectly; AI provider detector triggered despite no AI integration detected

### slack-bot-084
- **Platform**: slack
- **Detector**: ai-provider-detector
- **Confidence**: 66.8%
- **Analysis**: Low velocity score (0.31) should reduce suspicion; Normal business hours activity pattern flagged incorrectly; AI provider detector triggered despite no AI integration detected

### slack-bot-012
- **Platform**: slack
- **Detector**: ai-provider-detector
- **Confidence**: 66.8%
- **Analysis**: Low velocity score (0.22) should reduce suspicion; Normal business hours activity pattern flagged incorrectly; AI provider detector triggered despite no AI integration detected

## Top 5 False Negatives (Most Dangerous Misses)

### microsoft-flow-050
- **Platform**: microsoft
- **Attack Type**: data_exfiltration
- **Detector**: ai-provider-detector
- **Confidence**: 68.3%
- **Analysis**: High velocity score (0.93) not weighted enough; AI provider detector failed to flag AI integration; Permission escalation detector not triggered; Data volume detector missed anomalous pattern; Off-hours data exfiltration pattern missed

### slack-bot-001
- **Platform**: slack
- **Attack Type**: data_exfiltration
- **Detector**: none
- **Confidence**: 0.0%
- **Analysis**: Critical miss: data_exfiltration attack not detected by any detector; AI provider (openai) integration went undetected; Anomalous data volume pattern missed

### google-script-002
- **Platform**: google
- **Attack Type**: privilege_escalation
- **Detector**: none
- **Confidence**: 0.0%
- **Analysis**: Critical miss: privilege_escalation attack not detected by any detector; AI provider (anthropic) integration went undetected; Permission escalation pattern not flagged

## Breakdown by Detector

| Detector | FP Count | FN Count | FP Rate | FN Rate | Total Errors |
|----------|----------|----------|---------|---------|--------------|
| baseline-detector | 0 | 0 | 0.0% | 0.0% | 0 |
| velocity-detector | 0 | 0 | 0.0% | 0.0% | 0 |
| ai-provider-detector | 10 | 1 | 100.0% | 100.0% | 11 |

## Breakdown by Platform

| Platform | FP Count | FN Count | FP Rate | FN Rate | Total Errors |
|----------|----------|----------|---------|---------|--------------|
| microsoft | 2 | 1 | 12.5% | 6.3% | 3 |
| slack | 6 | 0 | 37.5% | 0.0% | 6 |
| google | 2 | 0 | 11.8% | 0.0% | 2 |

## Breakdown by Attack Type

| Attack Type | FP Count | FN Count | Total |
|-------------|----------|----------|-------|
| data_exfiltration | 0 | 2 | 2 |
| privilege_escalation | 0 | 1 | 1 |

## Recommendations for Improvement

1. CRITICAL: ai-provider-detector has high false positive rate (100.0%). Consider tuning confidence thresholds or feature weights.

2. CRITICAL: ai-provider-detector has high false negative rate (100.0%). This is a security risk - review detection logic and feature extraction.

3. ai-provider-detector has 11 total misclassifications. This detector needs comprehensive review and retraining.

4. slack platform has high false positive rate (37.5%). Review platform-specific feature extraction and normalization.

5. CRITICAL: 2 threats completely missed by all detectors. Urgent review required - possible blind spot in detection coverage.

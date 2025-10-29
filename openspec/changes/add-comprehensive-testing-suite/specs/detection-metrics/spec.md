## ADDED Requirements

### Requirement: Precision Calculation
The system SHALL calculate detection precision (true positives / (true positives + false positives)) and maintain ≥85% precision against ground truth dataset.

#### Scenario: Precision calculation with ground truth
- **WHEN** detection system processes 100 labeled automations
- **THEN** precision SHALL be calculated as: TP / (TP + FP)
- **AND** result SHALL be ≥0.85 (85%)

###  Requirement: Recall Calculation
The system SHALL calculate detection recall (true positives / (true positives + false negatives)) and maintain ≥90% recall to minimize missed threats.

#### Scenario: Recall calculation with ground truth
- **WHEN** detection system processes 100 labeled automations
- **THEN** recall SHALL be calculated as: TP / (TP + FN)
- **AND** result SHALL be ≥0.90 (90%)

### Requirement: F1 Score Calculation
The system SHALL calculate F1 score (harmonic mean of precision and recall) and maintain ≥87% to balance false positives and false negatives.

#### Scenario: F1 score calculation
- **WHEN** precision = 0.85 AND recall = 0.90
- **THEN** F1 score SHALL be 2 * (P * R) / (P + R) = 0.8727
- **AND** result SHALL be ≥0.87

### Requirement: Confusion Matrix Generation
The system SHALL generate confusion matrix with true positives, true negatives, false positives, and false negatives for each detector.

#### Scenario: Confusion matrix for velocity detector
- **WHEN** velocity detector processes ground truth dataset
- **THEN** system SHALL output matrix: {TP, TN, FP, FN}
- **AND** ALL values SHALL sum to total test cases

### Requirement: Baseline Monitoring
The system SHALL record baseline metrics (precision, recall, F1) after each detection algorithm deployment and track drift over time.

#### Scenario: Baseline recording on deployment
- **WHEN** new detection algorithm version is deployed
- **THEN** system SHALL run against ground truth
- **AND** record baseline metrics with timestamp

### Requirement: Drift Detection
The system SHALL compare current metrics to baseline and alert when precision drops ≥5% (warning) or recall drops ≥3% (critical).

#### Scenario: Precision drift warning
- **WHEN** current precision = 0.80 AND baseline = 0.86
- **THEN** system SHALL calculate drift = -7%
- **AND** trigger warning alert

#### Scenario: Recall drift critical alert
- **WHEN** current recall = 0.86 AND baseline = 0.90
- **THEN** system SHALL calculate drift = -4.4%
- **AND** trigger critical alert

### Requirement: False Positive Tracking
The system SHALL track all false positive detections (legitimate automations incorrectly flagged) and provide detailed misclassification reports.

#### Scenario: False positive logging
- **WHEN** legitimate automation is flagged as malicious
- **THEN** system SHALL log {automation_id, expected_label, predicted_label, confidence, timestamp}
- **AND** increment false positive counter

### Requirement: False Negative Tracking
The system SHALL track all false negative detections (malicious automations missed) and prioritize for algorithm improvement.

#### Scenario: False negative logging
- **WHEN** malicious automation is NOT detected
- **THEN** system SHALL log {automation_id, expected_label, predicted_label, detector_name, timestamp}
- **AND** increment false negative counter
- **AND** trigger security review for high-severity cases

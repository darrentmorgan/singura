# Changelog

All notable changes to the SaaS X-Ray project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-09-10

### Added
- Runtime mock data toggle system with comprehensive API control
- Platform integration filtering (reduced from 8 to 3 focused platforms)
- Enhanced OAuth connection management with professional UX
- Comprehensive PDF generation system for enterprise compliance reporting
- Development-only API endpoints with advanced security constraints
- Audit logging for development mock data toggles

### Changed
- Refined platform card layout with improved visual hierarchy
- Consolidated documentation structure
- Optimized platform integration approach
- Improved responsive design for mobile and tablet interfaces

### Fixed
- Critical JavaScript errors in PDF generation (opportunity.priority.toUpperCase)
- Platform card rendering and interaction bugs
- Routing and connection management issues in OAuth flows

### Security
- Implemented strict constraints on development-only endpoints
- Enhanced OAuth integration security with proper token management
- Added comprehensive audit logging for mock data toggles
- Improved type safety across development and production environments

### Removed
- Deprecated platform integrations not meeting MVP requirements
- Outdated documentation and legacy code paths

## [1.0.0] - 2025-06-15

### Initial Release
- Base project setup
- Initial OAuth integration
- Basic platform discovery infrastructure
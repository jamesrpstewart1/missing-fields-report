# Changelog

All notable changes to the Missing Fields Report project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.4.0] - 2025-09-10

### Added
- **📊 Weekly Summary Report System**: Comprehensive weekly incident summary automation
  - Automated weekly reports running every Monday at 09:00 UTC
  - Previous Monday-Sunday date range calculation with proper edge case handling
  - Business unit breakdown with completion rates (Square, Cash, Afterpay)
  - Severity breakdown analysis with color-coded metrics
  - Top missing fields analysis and trending
  - Complete incident listing with clickable links to incident management platforms
  - Executive summary with key metrics and completion percentages

### Enhanced
- **📧 Email Report Formatting**: Significantly improved weekly email template
  - Professional HTML styling with metric cards and color-coded business units
  - Readable date format: "Monday 1 Sept to Sunday 7 Sept 2025"
  - Severity filtering information moved to header section for better organization
  - Fixed background color formatting issues in severity filtering section
  - Simplified "Required Fields Monitored" section - removed field descriptions, showing only field names
  - Responsive design with proper table formatting and visual hierarchy

### Technical Implementation
- **New Functions**:
  - `runWeeklySummaryReport()`: Main weekly report generation function
  - `generateWeeklySummary()`: Weekly metrics calculation and analysis
  - `buildWeeklySummaryEmailContent()`: Professional HTML email template builder
  - `sendWeeklySummaryEmail()`: Weekly email delivery system
  - `setupWeeklyAutomation()`: Weekly trigger configuration
  - `cancelWeeklyAutomation()`: Weekly automation management
  - `showWeeklyAutomationStatus()`: Status monitoring and reporting
  - `weeklyAutomatedSummary()`: Automated execution handler
  - `logWeeklyExecution()`: Weekly execution logging

### Configuration & Automation
- **Weekly Automation System**:
  - Time-driven triggers for Monday 09:00 UTC execution
  - Automatic date range calculation for previous Monday-Sunday period
  - Configurable email recipients via existing Config sheet
  - Menu integration with weekly summary management options
  - Status monitoring and trigger management capabilities

### Date Range & Filtering
- **Smart Date Calculation**: 
  - Handles all days of the week correctly for previous Monday-Sunday calculation
  - Proper timezone handling and edge case management
  - Fixed date discrepancy between Google Sheet output and email reports
  - Consistent date formatting across all report components

### User Interface
- **Enhanced Menu System**: Added comprehensive weekly summary management
  - "Generate Weekly Summary Now" for immediate execution
  - "Setup Weekly Automation" for trigger configuration
  - "Cancel Weekly Automation" for automation management
  - "Show Weekly Status" for monitoring and status checking

### Bug Fixes
- **Date Synchronization**: Fixed discrepancy between Google Sheet and email report dates
- **Background Color**: Resolved formatting issues in severity filtering section
- **Field Descriptions**: Removed redundant descriptions from "Required Fields Monitored" section
- **Date Format**: Improved readability with human-friendly date format display

### Documentation
- **Updated Menu System**: Enhanced custom menu with weekly summary options
- **Comprehensive Logging**: Detailed execution logging for weekly report generation
- **Status Monitoring**: Real-time status checking and automation management

### Files Modified
- `src/apps-script/Code.gs`: Major enhancements with weekly summary system implementation

## [2.2.0] - 2025-09-09

### Added
- **🎯 Severity Filtering System**: Comprehensive severity-based incident filtering
  - Configurable severity level filtering for both incident.io and FireHydrant platforms
  - Platform-specific severity configurations with granular control
  - Support for incident.io "Internal Impact" severity variants
  - Enable/disable functionality via Config sheet parameters

### Enhanced
- **📊 Summary Tab**: Added severity filtering status and criteria display in Executive Summary
- **📧 Email Reports**: Enhanced email notifications with severity filtering information
  - HTML and plain text formats include filtering status and criteria
  - Clear indication of enabled/disabled state and impact
- **📋 Tracking Sheet**: New Severity column for better incident visibility
  - Cross-platform severity extraction with `getIncidentSeverity()` function
  - Updated headers and formatting for enhanced data presentation

### Technical Implementation
- **New Functions**:
  - `matchesIncidentIOSeverity()`: Platform-specific severity matching for incident.io
  - `matchesFireHydrantSeverity()`: Platform-specific severity matching for FireHydrant
  - `getSeverityFilteringSummary()`: Consistent severity status reporting
  - `getIncidentSeverity()`: Cross-platform severity extraction
- **Enhanced Functions**:
  - Updated `fetchIncidentsFromIncidentIO()` and `fetchIncidentsFromFireHydrant()` with filtering logic
  - Enhanced `updateTrackingSheet()` with severity column support
  - Improved `generateTieredEmailContent()` with severity information

### Configuration
- **New Config Parameters**:
  - `enableSeverityFiltering`: Boolean to enable/disable severity filtering
  - `incidentioSeverities`: Array of incident.io severities to include (e.g., SEV0,SEV1,SEV2)
  - `includeInternalImpact`: Boolean to include Internal Impact severity variants
  - `firehydrantSeverities`: Array of FireHydrant severities to include
- **Backward Compatibility**: All new features disabled by default, maintaining existing behavior

### Testing & Validation
- **New Testing Function**: `testSeverityFiltering()` for comprehensive severity filtering validation
- **Menu Integration**: Added severity filtering test to Testing & Research submenu
- **Detailed Logging**: Enhanced logging for severity filtering decisions and impact

### Documentation
- **Enhanced README Sheet**: Comprehensive severity filtering documentation
  - Configuration examples and parameter descriptions
  - Behavior explanations for enabled/disabled states
  - Troubleshooting guidance for severity filtering issues
- **Updated Project Documentation**: README.md updated with severity filtering capabilities

### Files Modified
- `src/apps-script/Config.gs`: Core configuration management and utility functions
- `src/apps-script/IncidentAPI.gs`: Platform-specific filtering logic implementation
- `src/apps-script/EmailService.gs`: Email template enhancements with severity info
- `src/apps-script/Code.gs`: Testing functions and menu system updates

## [2.1.0] - 2025-01-09

### Added
- **New Field Validation**: Impact Start Date/Time via incident.io V2 timestamps endpoint
- **New Field Validation**: Incident Transcript URL via "Google Meet Transcript" custom field
- Enhanced Summary tab reporting with 5-field analysis (previously 3 fields)
- Dynamic total incidents display based on configurable lookback days
- V2 Incident Timestamps API integration for precise impact timing
- Custom field lookup system for transcript URL retrieval

### Changed
- **Performance Optimization**: Reduced runtime from 10+ minutes to ~69 seconds
- Updated field validation logic to handle 5 required fields instead of 3
- Enhanced Summary sheet formatting with improved readability for TOTAL rows
- Executive Summary now shows dynamic date ranges based on configuration
- Improved error handling for V2 API endpoint calls

### Fixed
- Configuration reading for `maxLookbackDays` parameter
- Summary sheet formatting issues with expanded field list
- Bold formatting removed from field names for consistency
- Row numbering alignment in Summary sheet formatting

### Technical Improvements
- Added `getImpactStartTimestamp()` function for V2 API integration
- Enhanced `getIncidentIOFieldValue()` with custom field support
- Updated `analyzeIncidents()` and `buildMissingFieldRows()` for 5-field analysis
- Optimized API call patterns to reduce execution time
- Improved field validation performance and reliability

### Documentation
- Updated README with new field requirements
- Enhanced system documentation with V2 API details
- Added troubleshooting guide for new field validation

## [2.0.0] - 2024-12-15

### Added
- Initial project setup with comprehensive documentation structure
- Google Apps Script modules for incident field validation
- Cross-platform API integration (incident.io and FireHydrant)
- Email notification system with HTML templates
- Google Sheets integration for configuration and logging
- Automated daily scheduling with Google Apps Script triggers
- Field validation for required fields: Affected Markets, Causal Type, Stabilization Type
- Support for multiple business units: Square, Cash, Afterpay
- Tracking system for incidents with missing fields
- Comprehensive error handling and logging
- GitHub workflow for code validation

### Technical Architecture
- **Core Engine**: Google Apps Script
- **Data Storage**: Google Sheets (configuration, logging, tracking)
- **Email Delivery**: MailApp/GmailApp
- **Version Control**: GitHub
- **Scheduling**: Time-driven triggers

### API Integrations
- **incident.io API**: Square and Cash business units
- **FireHydrant API**: Afterpay incidents
- Rate limiting and error handling for all API calls
- Configurable date ranges and filtering criteria

### Documentation
- Detailed requirements specification
- API integration documentation
- Step-by-step deployment guide
- Google Sheets structure documentation
- Email template documentation

## [0.1.0] - 2024-09-04

### Added
- Initial project structure
- Documentation framework
- Basic Apps Script modules
- Configuration templates
- Email notification system
- API integration patterns

### Notes
- This is the initial development version
- All features are in development and not yet production-ready
- Extensive testing required before deployment

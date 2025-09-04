# Missing Fields Report - Detailed Requirements

## Project Overview
Automated system to monitor and report missing required fields across incident.io and FireHydrant platforms, with daily email notifications to ensure incident data completeness.

## Core Functionality Requirements

### 1. Daily Automated Field Validation
- **Frequency**: Daily execution (time TBD - globally friendly)
- **Scope**: All active incidents across both platforms
- **Validation**: Check for presence and completeness of required fields
- **Tracking**: Monitor incidents until all required fields are completed

### 2. Required Fields to Monitor
- **Affected Markets** (also referred to as "Impacted Market")
- **Causal Type**
- **Stabilization Type**

### 3. Email Notification System
- **Trigger**: When required fields are missing from incidents
- **Format**: HTML email with incident details and direct links
- **Delivery**: Via MailApp/GmailApp
- **Content**: Incident summary, missing fields, direct links to incidents

## Incident Filtering Criteria ✅ FINALIZED

### Status Filtering
- **Decision**: Include ONLY incidents with the following statuses:
  - Stabilized
  - Postmortem Prep
  - Postmortem Meeting Prep
  - Closed
- **Exclusions**: 
  - Declined
  - Canceled
  - Triage
  - All other statuses

### Time Range Filtering
- **Decision**: Multi-tiered approach for comprehensive tracking:
  - **Email Report**: Focus on last 7 days (detailed incident list)
  - **Google Sheet Tracking**: Extended ranges for trend analysis
    - 7-30 days bucket
    - 30-60 days bucket
    - 90+ days bucket
  - **Email Summary**: Show counts for older buckets with reference to full report

### Incident Mode Filtering
- **Decision**: Include only:
  - 'standard' incident mode
  - 'retrospective' incident mode

### Incident Type Exclusions
- **Decision**: Exclude incidents containing:
  - '[TEST]'
  - '[Preemptive SEV]'

### Business Unit Filtering
- **Requirement**: Filter by business unit
- **Platforms**:
  - **incident.io**: Square and Cash business units
  - **FireHydrant**: Afterpay incidents
- **Implementation**: Leverage existing filtering logic from PPE Monthly Report

## Email Configuration ✅ FINALIZED

### Recipients
- **Development/Testing**: jamesstewart@squareup.com
- **Production**: Team email address (to be updated after successful testing)
- **Configuration**: Stored in Google Sheets Recipients sheet for easy updates

### Email Format
- **Template**: HTML format with professional styling
- **Content Requirements**:
  - **Primary Focus**: Last 7 days incidents (detailed list with incident refs)
  - **Summary Counts**: 7-30 days, 30-60 days, 90+ days buckets
  - **Platform identification**: incident.io or FireHydrant
  - **Business unit**: Square, Cash, or Afterpay
  - **Missing fields**: Clear list of which fields are missing
  - **Direct links**: Clickable incident references
  - **Call to action**: Reference to full Google Sheet report for older incidents

### Timing & Frequency
- **Schedule**: Daily at 9:00 AM
- **Timezone**: Global team friendly
- **Automation**: Time-driven Google Apps Script triggers

### Sender Configuration
- **Method**: MailApp (Google Apps Script default)
- **Subject Format**: "Missing Fields Report - [X] Incidents Need Attention"
- **From**: Automated system sender

### Escalation Rules
- **Initial Approach**: No escalation (focus on process establishment)
- **Future Enhancement**: Consider escalation after system is established

## Technical Requirements

### Data Sources
1. **incident.io API**
   - Business units: Square and Cash
   - Authentication: [Existing patterns from PPE Monthly Report]
   - Rate limits: [TO BE DOCUMENTED]

2. **FireHydrant API**
   - Business unit: Afterpay
   - Authentication: [TO BE CONFIGURED]
   - Rate limits: [TO BE DOCUMENTED]

### Implementation Stack
- **Core Engine**: Google Apps Script
- **Data Storage**: Google Sheets (configuration, logging, tracking)
- **Version Control**: GitHub
- **Email Delivery**: MailApp/GmailApp
- **Scheduling**: Time-driven triggers

### Google Sheets Structure
- **Configuration Sheet**: 
  - API credentials
  - Email recipients
  - Filtering criteria
  - Business unit mappings
- **Logging Sheet**:
  - Execution logs
  - Error tracking
  - Performance metrics
- **Tracking Sheet**:
  - Incident tracking
  - Field completion status
  - Historical data

### Error Handling Requirements
- **API Failures**: Retry logic with exponential backoff
- **Email Failures**: Fallback notification methods
- **Data Validation**: Input sanitization and validation
- **Logging**: Comprehensive error logging and monitoring

### Performance Requirements
- **Execution Time**: Complete within Google Apps Script limits
- **API Calls**: Efficient batching and pagination
- **Memory Usage**: Optimize for large datasets
- **Reliability**: 99%+ success rate for daily executions

## Functional Requirements

### Core Features
1. **Daily Field Validation**
   - Automated execution via time-driven triggers
   - Cross-platform incident retrieval
   - Field presence validation
   - Missing field identification

2. **Notification System**
   - HTML email generation
   - Recipient management
   - Delivery confirmation
   - Error handling

3. **Tracking and Logging**
   - Execution history
   - Incident status tracking
   - Performance metrics
   - Error logs

4. **Configuration Management**
   - Google Sheets-based configuration
   - Runtime parameter updates
   - Credential management
   - Business rule configuration

### User Interface Requirements
- **Google Sheets Interface**: User-friendly configuration and monitoring
- **Email Interface**: Clear, actionable notifications with direct links
- **Logging Interface**: Accessible execution and error logs

## Integration Requirements

### Existing System Integration
- **PPE Monthly Report**: Leverage existing API patterns and authentication
- **Google Sheet**: Use existing sheet (1TF0p345-fZaK5PnR2TgsmskxA_OHfGLyUL4Qp3b99Eg) or create new
- **incident.io**: Extend existing API integration
- **FireHydrant**: New API integration required

### Security Requirements
- **API Credentials**: Secure storage in Google Apps Script properties
- **Data Privacy**: Comply with incident data handling policies
- **Access Control**: Restrict access to authorized personnel only
- **Audit Trail**: Maintain logs of all system activities

## Success Criteria
1. **Functionality**: Successfully identify and report missing fields daily
2. **Reliability**: 99%+ uptime for daily executions
3. **Performance**: Complete execution within 10 minutes
4. **Usability**: Clear, actionable email notifications
5. **Maintainability**: Well-documented, modular code structure

## Assumptions and Dependencies
- **API Access**: Continued access to incident.io and FireHydrant APIs
- **Google Apps Script**: Platform availability and quota limits
- **Email Delivery**: Reliable email service via Google
- **Data Consistency**: Consistent field naming across platforms
- **Business Rules**: Stable requirements for field validation

## Risks and Mitigation
- **API Changes**: Monitor for API deprecations and changes
- **Rate Limits**: Implement proper throttling and retry logic
- **Data Volume**: Plan for scaling as incident volume grows
- **Email Delivery**: Implement fallback notification methods
- **Maintenance**: Ensure proper documentation for future updates

# Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Missing Fields Report system to production.

## Prerequisites

### Required Access
- [ ] Google Apps Script access
- [ ] Google Sheets access
- [ ] incident.io API access (Square/Cash business units)
- [ ] FireHydrant API access (Afterpay)
- [ ] Email sending permissions

### Required Credentials
- [ ] incident.io API key
- [ ] FireHydrant API key
- [ ] Google Sheet ID (existing: `1TF0p345-fZaK5PnR2TgsmskxA_OHfGLyUL4Qp3b99Eg`)

## Deployment Steps

### Step 1: Google Apps Script Setup

1. **Create New Apps Script Project**
   ```
   1. Go to https://script.google.com
   2. Click "New Project"
   3. Rename to "Missing Fields Report"
   4. Save the project
   ```

2. **Upload Source Code**
   ```
   1. Copy code from src/apps-script/ directory
   2. Create files in Apps Script editor:
      - Code.gs (main script)
      - Config.gs (configuration)
      - IncidentAPI.gs (API integration)
      - EmailService.gs (email functionality)
   ```

3. **Configure Properties**
   ```javascript
   // In Apps Script editor, go to Project Settings > Script Properties
   // Add the following properties:
   INCIDENT_IO_API_KEY: [your-incident-io-api-key]
   FIREHYDRANT_API_KEY: [your-firehydrant-api-key]
   GOOGLE_SHEET_ID: 1TF0p345-fZaK5PnR2TgsmskxA_OHfGLyUL4Qp3b99Eg
   EMAIL_RECIPIENTS: [comma-separated-email-list]
   ```

### Step 2: Google Sheets Configuration

1. **Open Configuration Sheet**
   ```
   https://docs.google.com/spreadsheets/d/1TF0p345-fZaK5PnR2TgsmskxA_OHfGLyUL4Qp3b99Eg
   ```

2. **Create Required Sheets**
   - [ ] Config (configuration parameters)
   - [ ] Logs (execution logs)
   - [ ] Tracking (incident tracking)
   - [ ] Recipients (email recipients)

3. **Set Up Configuration Data**
   ```
   Config Sheet Structure:
   | Parameter | Value | Description |
   |-----------|-------|-------------|
   | check_frequency | daily | How often to run |
   | lookback_days | 7 | Days to look back |
   | include_resolved | false | Include resolved incidents |
   | business_units | Square,Cash,Afterpay | Business units to check |
   ```

### Step 3: API Integration Testing

1. **Test incident.io Connection**
   ```javascript
   // Run in Apps Script editor
   function testIncidentIO() {
     const client = new IncidentAPIClient('incident.io');
     const incidents = client.getIncidents();
     console.log(`Retrieved ${incidents.length} incidents`);
   }
   ```

2. **Test FireHydrant Connection**
   ```javascript
   // Run in Apps Script editor
   function testFireHydrant() {
     const client = new IncidentAPIClient('firehydrant');
     const incidents = client.getIncidents();
     console.log(`Retrieved ${incidents.length} incidents`);
   }
   ```

3. **Test Field Validation**
   ```javascript
   // Run in Apps Script editor
   function testFieldValidation() {
     const validator = new FieldValidator();
     const results = validator.validateAllIncidents();
     console.log(`Found ${results.length} incidents with missing fields`);
   }
   ```

### Step 4: Email Configuration

1. **Test Email Sending**
   ```javascript
   // Run in Apps Script editor
   function testEmail() {
     const emailService = new EmailService();
     emailService.sendTestEmail();
   }
   ```

2. **Configure Recipients**
   ```
   Add email addresses to Recipients sheet:
   | Email | Role | Active |
   |-------|------|--------|
   | user@example.com | Primary | TRUE |
   | manager@example.com | Secondary | TRUE |
   ```

### Step 5: Automation Setup

1. **Create Time-Driven Trigger**
   ```javascript
   // Run once to set up daily trigger
   function setupDailyTrigger() {
     ScriptApp.newTrigger('runDailyCheck')
       .timeBased()
       .everyDays(1)
       .atHour(9) // 9 AM
       .create();
   }
   ```

2. **Configure Timezone**
   ```
   1. In Apps Script editor, go to Project Settings
   2. Set timezone to appropriate value
   3. Consider global team distribution
   ```

### Step 6: Testing and Validation

1. **Run Manual Test**
   ```javascript
   // Execute main function manually
   function testFullExecution() {
     runDailyCheck();
   }
   ```

2. **Verify Email Delivery**
   - [ ] Check email recipients receive notifications
   - [ ] Verify email format and links work
   - [ ] Test with various incident scenarios

3. **Check Logging**
   - [ ] Verify execution logs are written to Logs sheet
   - [ ] Check error handling works correctly
   - [ ] Validate performance metrics

### Step 7: Production Deployment

1. **Enable Triggers**
   ```
   1. Verify daily trigger is active
   2. Test trigger execution
   3. Monitor first few automated runs
   ```

2. **Set Up Monitoring**
   ```
   1. Create monitoring dashboard in Google Sheets
   2. Set up failure notifications
   3. Document escalation procedures
   ```

## Post-Deployment

### Monitoring Checklist
- [ ] Daily execution success
- [ ] Email delivery confirmation
- [ ] API response times
- [ ] Error rates and types
- [ ] Data accuracy validation

### Maintenance Tasks
- [ ] Weekly log review
- [ ] Monthly performance analysis
- [ ] Quarterly credential rotation
- [ ] Semi-annual requirement review

## Troubleshooting

### Common Issues

1. **API Authentication Failures**
   ```
   - Check API key validity
   - Verify permissions
   - Check rate limits
   ```

2. **Email Delivery Issues**
   ```
   - Verify recipient addresses
   - Check spam filters
   - Validate email format
   ```

3. **Google Sheets Access**
   ```
   - Confirm sheet permissions
   - Check sheet ID accuracy
   - Verify sheet structure
   ```

### Error Recovery

1. **Failed Execution Recovery**
   ```javascript
   // Manual recovery function
   function recoverFailedExecution() {
     // Implement recovery logic
   }
   ```

2. **Data Consistency Checks**
   ```javascript
   // Validate data integrity
   function validateDataConsistency() {
     // Implement validation logic
   }
   ```

## Rollback Procedures

### Emergency Rollback
1. Disable all triggers
2. Notify stakeholders
3. Revert to previous version
4. Document issues for analysis

### Planned Rollback
1. Schedule maintenance window
2. Backup current configuration
3. Deploy previous version
4. Validate functionality

## Security Considerations

### Access Control
- [ ] Limit Apps Script access to authorized personnel
- [ ] Secure API credentials
- [ ] Monitor access logs

### Data Protection
- [ ] Minimize data retention
- [ ] Sanitize logs
- [ ] Comply with data policies

## Support and Maintenance

### Documentation Updates
- Keep deployment guide current
- Update API documentation as needed
- Maintain troubleshooting guides

### Version Control
- Tag releases in GitHub
- Document changes in CHANGELOG.md
- Maintain deployment history

## Contact Information

### Technical Support
- **Primary**: [TO BE DETERMINED]
- **Secondary**: [TO BE DETERMINED]
- **Escalation**: [TO BE DETERMINED]

### Business Stakeholders
- **Product Owner**: [TO BE DETERMINED]
- **Business Sponsor**: [TO BE DETERMINED]

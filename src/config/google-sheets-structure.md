# Google Sheets Structure

This document defines the required structure for the Google Sheets that support the Missing Fields Report system.

## Required Sheets

### 1. Config Sheet
**Purpose:** Store system configuration parameters

| Column A (Parameter) | Column B (Value) | Column C (Description) |
|---------------------|------------------|------------------------|
| lookbackDays | 7 | Number of days to look back for incidents |
| includeStatuses | Open,In Progress,Investigating | Comma-separated list of statuses to include (empty = all) |
| cutoffDate | 2024-01-01 | Exclude incidents before this date (YYYY-MM-DD format) |
| emailRecipients | user1@company.com,user2@company.com | Comma-separated list of email recipients |
| includeResolved | false | Whether to include resolved incidents |
| businessUnits | square,cash,afterpay | Comma-separated list of business units to check |

### 2. Tracking Sheet
**Purpose:** Track incidents with missing fields over time

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | When the incident was first detected with missing fields |
| B | Reference | Incident reference number (e.g., INC-1234) |
| C | Platform | incident.io or firehydrant |
| D | Business Unit | square, cash, or afterpay |
| E | Summary | Incident title/summary |
| F | Missing Fields | Comma-separated list of missing fields |
| G | URL | Direct link to the incident |
| H | Created Date | When the incident was originally created |
| I | Status | Active, Resolved, or Ignored |

### 3. Logs Sheet
**Purpose:** Log system execution history

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | Full timestamp of execution |
| B | Date | Date of execution |
| C | Time | Time of execution |
| D | Total Incidents | Total number of incidents checked |
| E | Missing Fields Count | Number of incidents with missing fields |
| F | Action Taken | Email Sent, No Action Required, etc. |
| G | Status | Success, Error, Warning |

### 4. Recipients Sheet (Optional)
**Purpose:** Manage email recipients with additional metadata

| Column | Header | Description |
|--------|--------|-------------|
| A | Email | Email address |
| B | Name | Recipient name |
| C | Role | Role or department |
| D | Active | TRUE/FALSE - whether to include in notifications |
| E | Platform | Specific platform interest (optional) |
| F | Business Unit | Specific business unit interest (optional) |

## Sheet Setup Instructions

1. **Create the Google Sheet:**
   - Go to Google Sheets
   - Create a new spreadsheet
   - Name it "Missing Fields Report Configuration"

2. **Create the required sheets:**
   - Rename "Sheet1" to "Config"
   - Add additional sheets: "Tracking", "Logs", "Recipients"

3. **Set up the Config sheet:**
   - Add the headers in row 1: Parameter, Value, Description
   - Add the configuration parameters as shown in the table above
   - Adjust values according to your requirements

4. **Format the sheets:**
   - Apply header formatting (bold, background color)
   - Set appropriate column widths
   - Apply data validation where appropriate

5. **Set permissions:**
   - Share the sheet with the Google Apps Script service account
   - Ensure the script has edit permissions

6. **Get the Sheet ID:**
   - Copy the sheet ID from the URL
   - Add it to the Google Apps Script properties as 'GOOGLE_SHEET_ID'

## Configuration Examples

### Basic Configuration
```
Parameter: lookbackDays, Value: 7
Parameter: emailRecipients, Value: team@company.com
Parameter: businessUnits, Value: square,cash,afterpay
```

### Advanced Configuration
```
Parameter: lookbackDays, Value: 14
Parameter: includeStatuses, Value: Open,Investigating,In Progress
Parameter: cutoffDate, Value: 2024-01-01
Parameter: emailRecipients, Value: oncall@company.com,manager@company.com
Parameter: includeResolved, Value: false
Parameter: businessUnits, Value: square,cash
```

## Notes

- Empty values in the Config sheet will use system defaults
- The system will create missing sheets automatically if they don't exist
- All timestamps are stored in ISO format for consistency
- Email addresses should be comma-separated without spaces
- Boolean values should be "true" or "false" (case-insensitive)

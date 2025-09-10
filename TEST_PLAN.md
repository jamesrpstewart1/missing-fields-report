# Missing Fields Report - Comprehensive Test Plan

## 🎯 Testing Objective
Validate all report functionality before merging the weekly summary report feature to ensure:
- Daily reports continue working correctly
- Custom date range reports function properly  
- New weekly summary reports work as expected
- Data accuracy matches source systems (incident.io and FireHydrant)

## 📋 Test Environment Setup

### Prerequisites
- Access to Google Apps Script project
- Access to incident.io (Square and Cash)
- Access to FireHydrant (Afterpay)
- Email access to verify report delivery
- Google Sheets access for result validation

### Test Data Period
**Recommended Test Period**: Last 30 days from current date
- Provides sufficient data volume
- Includes multiple business units
- Covers various incident severities and statuses

---

## 🧪 Phase 1: Daily Report Testing

### Test 1.1: Standard Daily Report Execution
**Objective**: Verify original daily functionality works correctly

**Steps**:
1. Open Google Sheets project
2. Navigate to "🔍 Missing Fields Report" menu
3. Select "🔄 Check Missing Fields Now"
4. Wait for execution completion
5. Review results in Summary and Tracking tabs

**Expected Results**:
- Execution completes without errors (should take ~69 seconds)
- Summary tab shows executive metrics
- Tracking tab shows individual incidents with missing fields
- Email notification sent (if configured)

**Validation Criteria**:
- ✅ No script execution errors
- ✅ Summary tab populated with current data
- ✅ Tracking tab contains incident details
- ✅ Business unit totals match (Square + Cash + Afterpay)

### Test 1.2: Daily Report Data Accuracy
**Objective**: Verify daily report data matches source systems

**incident.io Filtering (Square & Cash)**:
```
Platform: incident.io
Date Range: Last 30 days
Status Filter: Include ONLY
  - Stabilized
  - Postmortem Prep
  - Postmortem Meeting Prep  
  - Closed
Mode Filter: Include ONLY
  - standard
  - retrospective
Exclude Types:
  - [TEST]
  - [Preemptive SEV]
```

**FireHydrant Filtering (Afterpay)**:
```
Platform: FireHydrant
Date Range: Last 30 days
Status Filter: Include ONLY
  - Stabilized
  - Remediation
  - Resolved
  - Retrospective Started
  - Retrospective Completed
  - Closed
Exclude Types:
  - [TEST]
  - [Preemptive SEV]
```

**Validation Steps**:
1. Count incidents in each platform using above filters
2. Compare totals with Summary tab "Total Incidents Processed"
3. Verify business unit breakdown matches platform distribution
4. Spot-check 5-10 incidents for field validation accuracy

---

## 🧪 Phase 2: Custom Date Range Testing

### Test 2.1: Custom Date Range Execution
**Objective**: Verify custom date functionality works correctly

**Steps**:
1. Navigate to "📅 Custom Date Ranges" menu
2. Select "📅 Run with Custom Dates"
3. Enter date range: 7 days ago to today (YYYY-MM-DD format)
4. Confirm date range selection
5. Wait for execution completion
6. Review results

**Expected Results**:
- Date picker accepts valid dates
- Execution completes for specified range
- Summary shows date range context
- Results reflect only incidents from specified period

### Test 2.2: Preset Date Range Testing
**Objective**: Verify preset date ranges work correctly

**Steps**:
1. Select "📆 Run with Preset Range"
2. Choose "Last 30 Days" (option 6)
3. Confirm selection
4. Wait for execution completion
5. Repeat with "Current Month" (option 1)

**Expected Results**:
- Preset calculations are accurate
- Results match expected date ranges
- Different presets show different data volumes

### Test 2.3: Custom Date Range Data Accuracy
**Use same filtering criteria as Phase 1, but adjust date ranges to match your custom selections**

---

## 🧪 Phase 3: Weekly Summary Testing

### Test 3.1: Manual Weekly Report Generation
**Objective**: Verify weekly summary report works correctly

**Steps**:
1. Navigate to "📊 Weekly Summary Report" menu
2. Select "📊 Generate Weekly Summary Now"
3. Wait for execution completion
4. Check email for weekly summary report
5. Review report content and formatting

**Expected Results**:
- Execution completes without errors
- Weekly email received with professional formatting
- Report covers previous Monday-Sunday period
- Business unit and severity breakdowns included
- "Required Fields Monitored" section shows clean field names (no descriptions)

### Test 3.2: Weekly Report Date Calculation
**Objective**: Verify date calculation logic for different days

**Test Matrix**:
| Run Date (Day) | Expected Start Date | Expected End Date |
|----------------|-------------------|------------------|
| Monday | Previous Monday | Previous Sunday |
| Tuesday | Previous Monday | Previous Sunday |
| Wednesday | Previous Monday | Previous Sunday |
| Thursday | Previous Monday | Previous Sunday |
| Friday | Previous Monday | Previous Sunday |
| Saturday | Previous Monday | Previous Sunday |
| Sunday | Previous Monday | Previous Sunday |

**Steps**:
1. Note current day of week
2. Run weekly report
3. Check email for date range in subject and body
4. Verify dates match expected previous Monday-Sunday

### Test 3.3: Weekly Report Data Accuracy
**Objective**: Verify weekly data matches source systems for the specific week

**incident.io Filtering for Weekly Data**:
```
Platform: incident.io
Date Range: [Previous Monday 00:00] to [Previous Sunday 23:59]
Status Filter: Exclude ONLY
  - Declined
  - Canceled
  - Cancelled
  - Triage
  - Merged
Mode Filter: Include ONLY
  - standard
  - retrospective
Exclude Types:
  - [TEST]
  - [Preemptive SEV]
```

**FireHydrant Filtering for Weekly Data**:
```
Platform: FireHydrant  
Date Range: [Previous Monday 00:00] to [Previous Sunday 23:59]
Status Filter: Exclude ONLY
  - Declined
  - Canceled
  - Cancelled
  - Triage
  - Merged
Exclude Types:
  - [TEST]
  - [Preemptive SEV]
```

**Key Difference**: Weekly reports use EXCLUDE filtering (show all incidents EXCEPT excluded statuses) vs Daily reports use INCLUDE filtering (show ONLY included statuses).

---

## 🧪 Phase 4: Data Accuracy Deep Dive

### Test 4.1: Field Validation Accuracy
**Objective**: Verify field validation logic is correct

**Steps**:
1. Select 10 incidents from Tracking tab marked as "missing fields"
2. Manually check each incident in source platform
3. Verify the 5 required fields:
   - Affected Markets
   - Causal Type  
   - Stabilization Type
   - Impact Start Date
   - Transcript URL

**Field Checking Guide**:

**incident.io Fields**:
- **Affected Markets**: Custom field dropdown
- **Causal Type**: Custom field dropdown  
- **Stabilization Type**: Custom field dropdown
- **Impact Start Date**: Check incident timestamps (impact_at field)
- **Transcript URL**: Custom field "Google Meet Transcript"

**FireHydrant Fields**:
- **Affected Markets**: Custom field dropdown
- **Causal Type**: Custom field dropdown
- **Stabilization Type**: Custom field dropdown  
- **Impact Start Date**: Check incident started_at timestamp
- **Transcript URL**: Custom field or description area

### Test 4.2: Business Unit Classification
**Objective**: Verify incidents are correctly assigned to business units

**Steps**:
1. Check 5 incidents from each business unit in Tracking tab
2. Verify they came from correct platform:
   - Square incidents → incident.io (Square workspace)
   - Cash incidents → incident.io (Cash workspace)  
   - Afterpay incidents → FireHydrant

### Test 4.3: Severity Filtering (if enabled)
**Objective**: Verify severity filtering works correctly

**Steps**:
1. Check Config sheet for `enableSeverityFiltering` setting
2. If enabled, note configured severities
3. Verify report only includes incidents with configured severities
4. Test with severity filtering disabled vs enabled

---

## 🧪 Phase 5: Email Delivery Testing

### Test 5.1: Email Format Validation
**Objective**: Verify all email types format correctly

**Daily Email Checklist**:
- ✅ Subject line includes date range
- ✅ HTML formatting renders properly
- ✅ Business unit colors display correctly
- ✅ Missing fields breakdown is accurate
- ✅ Incident links are clickable and work

**Weekly Email Checklist**:
- ✅ Subject line shows weekly date range
- ✅ Readable date format: "Monday X Month to Sunday Y Month YYYY"
- ✅ Executive summary metrics are accurate
- ✅ Business unit breakdown table is complete
- ✅ Severity breakdown table is included
- ✅ "Required Fields Monitored" shows ONLY field names (no descriptions)
- ✅ Severity filtering info appears in header section
- ✅ All incidents listed with clickable links

### Test 5.2: Email Recipients
**Objective**: Verify emails reach configured recipients

**Steps**:
1. Check Config sheet for email recipients
2. Run each report type
3. Verify all recipients receive emails
4. Check spam/junk folders if needed

---

## 🧪 Phase 6: Automation Testing

### Test 6.1: Weekly Automation Setup
**Objective**: Verify weekly automation can be configured

**Steps**:
1. Navigate to "📊 Weekly Summary Report" menu
2. Select "🔧 Setup Weekly Automation"
3. Confirm setup completion
4. Select "📊 Show Weekly Status" to verify trigger is active
5. Note trigger ID for reference

**Expected Results**:
- Setup completes without errors
- Status shows "ENABLED" with Monday 9:00 AM schedule
- Trigger ID is displayed

### Test 6.2: Automation Status Management
**Objective**: Verify automation can be managed

**Steps**:
1. Check current automation status
2. Cancel weekly automation
3. Verify status shows "DISABLED"
4. Re-enable automation
5. Verify status shows "ENABLED" again

---

## 📊 Test Results Template

### Test Execution Log
| Test ID | Test Name | Status | Notes | Issues Found |
|---------|-----------|--------|-------|--------------|
| 1.1 | Daily Report Execution | ⏳ | | |
| 1.2 | Daily Data Accuracy | ⏳ | | |
| 2.1 | Custom Date Execution | ⏳ | | |
| 2.2 | Preset Date Testing | ⏳ | | |
| 2.3 | Custom Data Accuracy | ⏳ | | |
| 3.1 | Weekly Report Generation | ⏳ | | |
| 3.2 | Weekly Date Calculation | ⏳ | | |
| 3.3 | Weekly Data Accuracy | ⏳ | | |
| 4.1 | Field Validation | ⏳ | | |
| 4.2 | Business Unit Classification | ⏳ | | |
| 4.3 | Severity Filtering | ⏳ | | |
| 5.1 | Email Format | ⏳ | | |
| 5.2 | Email Recipients | ⏳ | | |
| 6.1 | Automation Setup | ⏳ | | |
| 6.2 | Automation Management | ⏳ | | |

### Data Comparison Results
| Platform | Expected Count | Actual Count | Match | Notes |
|----------|---------------|--------------|-------|-------|
| incident.io (Square) | | | | |
| incident.io (Cash) | | | | |
| FireHydrant (Afterpay) | | | | |
| **Total** | | | | |

---

## 🚨 Critical Issues Checklist

Before approving merge, ensure:
- [ ] No script execution errors in any test
- [ ] Data accuracy matches source systems (±5% tolerance acceptable)
- [ ] All email formats render correctly
- [ ] Weekly automation can be enabled/disabled
- [ ] Field validation logic is accurate
- [ ] Business unit classification is correct
- [ ] Date calculations are accurate for all scenarios

## 🎯 Success Criteria

**Merge Approved When**:
- ✅ All tests pass or have acceptable workarounds
- ✅ Data accuracy is within 5% of source systems
- ✅ No critical functionality regressions
- ✅ Email formatting is professional and correct
- ✅ Automation system works reliably

## 📝 Notes Section
*Use this space to document any issues, workarounds, or observations during testing*

---

**Test Plan Version**: 1.0  
**Created**: September 10, 2025  
**Target Completion**: Before feature branch merge

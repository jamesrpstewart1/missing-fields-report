# Missing Fields Report - Key Decisions Log

## Decision Log - September 4, 2024

This document captures all key decisions made during the project development for future reference.

### 1. Email Recipients ✅
- **Development/Testing**: `jamesstewart@squareup.com`
- **Production**: Team email address (to be updated after successful testing)
- **Configuration**: Stored in Google Sheets Recipients sheet for easy updates
- **Rationale**: Start with single recipient for testing, expand to team after validation

### 2. Timing & Frequency ✅
- **Schedule**: Daily at 9:00 AM
- **Timezone**: Global team friendly
- **Pattern**: Same as PPE Monthly Report (proven approach)
- **Rationale**: 9:00 AM works well for global teams, proven by existing PPE Report

### 3. Lookback Period ✅ - Multi-Tiered Approach
- **Email Report**: Focus on last 7 days (detailed incident list with references)
- **Google Sheet Tracking**: Extended ranges for trend analysis
  - 7-30 days bucket
  - 30-60 days bucket  
  - 90+ days bucket
- **Email Summary**: Show counts for older buckets with reference to full Google Sheet report
- **Rationale**: 
  - Keeps email focused and actionable (7 days only)
  - Maintains comprehensive tracking for trend analysis
  - Won't overwhelm recipients initially when there are many missing fields
  - Shows improvement over time as process matures

### 4. Incident Filtering ✅
#### Status Filtering - Platform Specific (INCLUDE ONLY)

**incident.io (Square/Cash)**:
- Stabilized
- Postmortem Prep
- Postmortem Meeting Prep
- Closed

**FireHydrant (Afterpay)**:
- Stabilized
- Remediation
- Resolved
- Retrospective Started
- Retrospective Completed
- Closed

#### Status Filtering (EXCLUDE)
- Declined
- Canceled
- Triage
- All other statuses not listed above

#### Incident Mode Filtering (INCLUDE ONLY)
- 'standard' incident mode
- 'retrospective' incident mode

#### Incident Type Filtering (EXCLUDE)
- '[TEST]' incidents
- '[Preemptive SEV]' incidents

**Rationale**: Focus on incidents that have progressed through the incident lifecycle where field completion is expected and meaningful for analysis.

### 5. API Access ✅
- **incident.io Square**: Use same API key as PPE Monthly Report
  - Property name: `SQUARE_API_KEY`
- **incident.io Cash**: Use same API key as PPE Monthly Report
  - Property name: `CASH_API_KEY`
- **FireHydrant Afterpay**: Create new API key
  - Property name: `FIREHYDRANT_API_KEY`
- **Storage**: All keys stored in Google Apps Script Properties Service (secure)
- **Rationale**: Leverage existing proven API access, add FireHydrant for Afterpay coverage

### 6. Required Fields to Monitor ✅
- **Affected Markets** (also referred to as "Impacted Market")
- **Causal Type**
- **Stabilization Type** (note: may be "Stabilisation Type" in some systems)

### 7. Business Unit Coverage ✅
- **incident.io**: Square and Cash business units
- **FireHydrant**: Afterpay incidents
- **Rationale**: Comprehensive coverage across all major business units

### 8. Google Sheets Structure ✅
- **Use existing sheet**: `1TF0p345-fZaK5PnR2TgsmskxA_OHfGLyUL4Qp3b99Eg` (same as PPE Report)
- **Required sheets**: Config, Tracking, Logs, Recipients
- **Rationale**: Leverage existing infrastructure and proven patterns

### 9. Email Content Strategy ✅
- **Primary Focus**: Last 7 days incidents (detailed list with incident references)
- **Secondary Content**: Summary counts for older buckets (7-30, 30-60, 90+ days)
- **Call to Action**: Reference to full Google Sheet report for comprehensive view
- **Format**: Professional HTML email with direct incident links
- **Subject**: "Missing Fields Report - [X] Incidents Need Attention"

### 10. Implementation Approach ✅
- **Foundation**: Leverage PPE Monthly Report patterns and code structure
- **API Integration**: Use proven pagination, rate limiting, and error handling
- **Field Extraction**: Adapt robust `getCustomFieldValue()` function
- **Automation**: Time-driven triggers with professional management UI
- **Security**: Google Apps Script Properties Service for credential storage

## Future Decisions Needed

### Phase 2 Decisions (After Initial Implementation)
- Production email recipient list (team email address)
- Escalation rules for persistent missing fields
- Additional field monitoring requirements
- Performance optimization needs

### Phase 3 Decisions (After Production Deployment)
- Reporting frequency adjustments based on usage
- Additional business unit coverage
- Integration with other incident management tools
- Advanced analytics and trending features

## Decision Change Process

To modify any of these decisions:
1. Update this DECISIONS.md file with new decision and rationale
2. Update relevant documentation (requirements.md, deployment-guide.md)
3. Update implementation code as needed
4. Test changes thoroughly before deployment
5. Communicate changes to stakeholders

---
*Last Updated: September 4, 2024*
*Next Review: After Phase 1 completion*

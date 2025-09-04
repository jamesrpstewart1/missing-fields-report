# Missing Fields Report Project

## Overview
Automated system to monitor and report missing required fields across incident.io and FireHydrant platforms, with daily email notifications to ensure incident data completeness.

## Core Functionality
- **Daily automated check** of incident fields across incident.io and FireHydrant
- **Email notification** when required fields are missing
- **Track incidents** until fields are completed

## Required Fields to Monitor
- **Affected Markets**
- **Causal Type** 
- **Stabilization Type**

## Project Structure
```
missing-fields-report/
├── README.md                 # This file
├── docs/                     # Documentation
│   ├── requirements.md       # Detailed requirements
│   ├── api-documentation.md  # API integration docs
│   └── deployment-guide.md   # Deployment instructions
├── src/                      # Source code
│   ├── apps-script/          # Google Apps Script files
│   ├── config/               # Configuration files
│   └── templates/            # Email templates
├── tests/                    # Test files
└── .github/                  # GitHub workflows
```

## Development Stages

### Stage 1: Foundation & Planning ⏳
- [ ] Finalize requirements
- [ ] Set up Google Sheet structure
- [ ] Configure API access for both platforms
- [ ] Test API connections and field mapping

### Stage 2: Core Development
- [ ] Build incident.io API integration
- [ ] Build FireHydrant API integration
- [ ] Create data processing logic
- [ ] Develop email template and sending function

### Stage 3: Automation & Scheduling
- [ ] Set up time-driven triggers
- [ ] Add logging and error handling
- [ ] Test daily automation
- [ ] Configure email delivery

### Stage 4: Testing & Refinement
- [ ] Test with sample data
- [ ] Validate email format and recipients
- [ ] Test edge cases and error scenarios
- [ ] Get team feedback on email format

### Stage 5: Deployment & Monitoring
- [ ] Launch to production
- [ ] Monitor for issues
- [ ] Gather feedback and iterate
- [ ] Document for future maintenance

## Existing Assets to Leverage
- **PPE Monthly Report**: `/Users/jamesstewart/PPE Monthly Report/apps-script/PPE_Monthly_Report.gs`
- **Google Sheet**: `1TF0p345-fZaK5PnR2TgsmskxA_OHfGLyUL4Qp3b99Eg`
- **Platform filtering logic**: Already defined for Square/Cash in existing Apps Script
- **API integration patterns**: incident.io API calls already implemented
- **Authentication methods**: Working API access patterns

## Technical Stack
- **Google Apps Script**: Core automation engine
- **Google Sheets**: Configuration, logging, and data management
- **GitHub**: Version control and collaboration
- **MailApp/GmailApp**: Email delivery system

## Data Sources
- **incident.io API**: Square and Cash business units
- **FireHydrant API**: Afterpay incidents

## Getting Started
1. Clone this repository
2. Review the requirements documentation in `/docs/`
3. Set up Google Apps Script project
4. Configure API access credentials
5. Follow the deployment guide

## Contributing
Please follow the development stages outlined above and ensure all changes are properly documented and tested.

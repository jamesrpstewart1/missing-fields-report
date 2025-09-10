# Missing Fields Report Project

## Overview
**Production-ready automated system** to monitor and report missing required fields across incident.io and FireHydrant platforms, with daily email notifications to ensure incident data completeness.

## 🎉 Version 2.4.0 - Now Available!

### ✅ Core Functionality
- **Daily automated check** of incident fields across incident.io and FireHydrant
- **📊 Weekly summary reports** - Automated Monday reports covering previous Monday-Sunday
- **Email notification** when required fields are missing
- **Track incidents** until fields are completed
- **Performance optimized** - 69 second execution time
- **Comprehensive reporting** with Summary dashboard
- **🎯 Severity filtering** - Focus on critical incidents by severity level
- **📅 Custom date range reports** - Generate ad-hoc reports for any time period
- **📧 Professional email formatting** - Clean, organized report structure

### 📋 Required Fields Monitored (5 Total)
- **Affected Markets**
- **Causal Type** 
- **Stabilization Type**
- **Impact Start Date/Time** ⭐ NEW!
- **Incident Transcript URL** ⭐ NEW!

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

## 🚀 Current Status: Production Ready!

### ✅ Completed Development Stages

#### Stage 1: Foundation & Planning ✅
- [x] Requirements finalized and documented
- [x] Google Sheet structure configured and operational
- [x] API access configured for both platforms
- [x] API connections tested and field mapping validated

#### Stage 2: Core Development ✅
- [x] incident.io API integration (V1 and V2 endpoints)
- [x] FireHydrant API integration
- [x] Data processing logic with 5-field validation
- [x] Email template and sending function

#### Stage 3: Automation & Scheduling ✅
- [x] Time-driven triggers for daily automation
- [x] Comprehensive logging and error handling
- [x] Daily automation tested and operational
- [x] Email delivery configured and working

#### Stage 4: Testing & Refinement ✅
- [x] Tested with production data
- [x] Email format validated with stakeholders
- [x] Edge cases and error scenarios handled
- [x] Performance optimized (69 second runtime)

#### Stage 5: Deployment & Monitoring ✅
- [x] Launched to production
- [x] Monitoring and logging in place
- [x] System operational and stable
- [x] Documentation complete

## 🎯 Key Features & Capabilities

### 📊 Advanced Reporting
- **Summary Dashboard**: Executive-level metrics and breakdowns
- **Weekly Summary Reports**: Automated Monday reports with comprehensive incident analysis
- **Tracking Sheet**: Detailed incident-by-incident analysis
- **Date Bucket Analysis**: 0-7 days, 7-30 days, 30-90 days, 90+ days
- **Business Unit Breakdown**: Square, Cash, Afterpay analytics
- **Platform Analysis**: incident.io and FireHydrant comparisons
- **📅 Custom Date Range Reports**: Generate reports for any specific time period
- **📧 Professional Email Templates**: Clean, organized formatting with simplified field lists

### ⚡ Performance & Reliability
- **Fast Execution**: ~69 seconds for full analysis
- **Robust Error Handling**: Comprehensive retry logic and error recovery
- **API Integration**: V1 and V2 incident.io endpoints, FireHydrant API
- **Configurable**: All settings managed via Google Sheets
- **Automated**: Daily execution at 9:00 AM

### 🔍 Field Validation
- **Standard Fields**: Affected Markets, Causal Type, Stabilization Type
- **Advanced Fields**: Impact Start Date via V2 timestamps endpoint
- **Custom Fields**: Transcript URL via "Google Meet Transcript" lookup
- **Multi-Platform**: Different validation logic for each platform
- **Accurate Detection**: Zero false positives

### 🎯 Severity Filtering
- **Configurable Filtering**: Focus on specific severity levels (SEV0, SEV1, SEV2, etc.)
- **Platform-Specific**: Different severity configurations for incident.io and FireHydrant
- **Internal Impact Support**: Handle incident.io "Internal Impact" severity variants
- **Dashboard Integration**: Severity status displayed in Summary and Email reports
- **Flexible Configuration**: Enable/disable filtering via Config sheet parameters

### 📅 Custom Date Range Reports (NEW!)
- **Flexible Date Selection**: Choose any start and end date for analysis
- **Preset Date Ranges**: Current month, last month, quarter, YTD, last 30/90 days
- **Custom Date Picker**: User-friendly interface for date selection
- **Date Range Validation**: Automatic validation and confirmation dialogs
- **Comprehensive Analysis**: Same detailed analysis as daily reports for any time period
- **Email Integration**: Custom date range reports sent via email with full formatting
- **Sheet Updates**: Summary and Tracking sheets updated with date range context
- **Performance Optimized**: Efficient API filtering for large date ranges

## 🛠️ Technical Architecture

### Core Components
- **Google Apps Script**: Main automation engine
- **Google Sheets**: Configuration, logging, tracking, and reporting
- **incident.io API**: V1 and V2 endpoints for Square and Cash
- **FireHydrant API**: Afterpay incident management
- **Email System**: HTML-formatted notifications via MailApp/GmailApp

### Data Flow
1. **Daily Trigger**: Automated execution at 9:00 AM (or manual/custom date range execution)
2. **API Calls**: Fetch incidents from all platforms (with optional date filtering)
3. **Field Validation**: Check all 5 required fields
4. **Analysis**: Generate comprehensive reports and summaries
5. **Notifications**: Send HTML email reports to stakeholders
6. **Tracking**: Update Google Sheets with results and date range context

## 📈 Performance Metrics

- **Execution Time**: ~69 seconds (85% improvement from v2.0)
- **API Reliability**: <1% error rate with retry logic
- **Field Accuracy**: Zero false positives in validation
- **Coverage**: 100% of required fields across all platforms
- **Automation**: 99%+ uptime for daily executions

## 🚀 Getting Started

### For Users
1. Access the Google Sheet dashboard
2. Review the Summary tab for executive overview
3. Use Tracking tab for detailed incident analysis
4. Configure email recipients in Config tab
5. **NEW**: Use "Weekly Summary Report" menu for weekly automation
   - Select "Generate Weekly Summary Now" for immediate weekly report
   - Select "Setup Weekly Automation" to enable Monday 09:00 UTC automation
   - Select "Show Weekly Status" to monitor automation status
6. **NEW**: Use "Custom Date Ranges" menu for ad-hoc reports
   - Select "Run with Custom Dates" for specific date ranges
   - Select "Run with Preset Range" for common periods (last month, quarter, etc.)

### For Developers
1. Clone this repository
2. Review documentation in `/docs/`
3. Set up Google Apps Script project
4. Configure API credentials
5. Follow deployment guide

## 📚 Documentation

- **[Requirements](docs/requirements.md)**: Detailed system requirements
- **[API Documentation](docs/api-documentation.md)**: API integration details
- **[Deployment Guide](docs/deployment-guide.md)**: Step-by-step setup
- **[CHANGELOG](CHANGELOG.md)**: Version history and updates
- **[PROJECT_STATUS](PROJECT_STATUS.md)**: Current status and roadmap

## 🤝 Support & Maintenance

### Current Status
- ✅ **Production Ready**: Fully operational and stable
- ✅ **Monitored**: Daily execution logs and performance tracking
- ✅ **Supported**: Active maintenance and updates
- ✅ **Documented**: Comprehensive documentation and guides

### Future Enhancements
- Real-time webhook integration
- Advanced analytics and trend analysis
- Mobile notifications (SMS/Slack)
- Web-based dashboard interface

---

**Version**: 2.4.0  
**Last Updated**: September 10, 2025  
**Status**: Production Ready ✅

## 🆕 What's New in v2.4.0

### 📊 Weekly Summary Report System
- **Automated Weekly Reports**: Comprehensive weekly incident summaries running every Monday at 09:00 UTC
- **Previous Monday-Sunday Coverage**: Smart date calculation covering the previous full week
- **Business Unit Analysis**: Complete breakdown with completion rates for Square, Cash, and Afterpay
- **Severity Breakdown**: Color-coded severity analysis with completion metrics
- **Executive Dashboard**: Professional metrics cards with key performance indicators

### 📧 Enhanced Email Formatting
- **Professional HTML Templates**: Clean, organized email design with metric cards
- **Readable Date Format**: Human-friendly format like "Monday 1 Sept to Sunday 7 Sept 2025"
- **Simplified Field Lists**: Removed field descriptions, showing only clean field names
- **Improved Organization**: Severity filtering information moved to header section
- **Visual Hierarchy**: Color-coded business units and responsive table formatting

### 🛠️ Technical Enhancements
- **Smart Date Calculation**: Handles all edge cases for previous Monday-Sunday calculation
- **Fixed Date Synchronization**: Resolved discrepancy between Google Sheet and email dates
- **Background Color Fix**: Corrected formatting issues in severity filtering sections
- **Menu System**: Comprehensive weekly summary management with setup and monitoring
- **Automation Management**: Full trigger configuration and status monitoring capabilities

### 🎯 User Experience Improvements
- **One-Click Setup**: Easy weekly automation configuration via menu system
- **Status Monitoring**: Real-time automation status and trigger management
- **Immediate Execution**: Generate weekly reports on-demand for testing
- **Clean Interface**: Simplified and organized email templates for better readability

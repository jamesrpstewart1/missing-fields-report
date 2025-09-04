/**
 * Missing Fields Report - Main Script
 * Automatically checks for missing required fields in incidents across incident.io and FireHydrant
 * Sends daily email notifications when required fields are missing
 * 
 * FEATURES: Cross-platform integration, field validation, email notifications, tracking
 */

// Configuration for both platforms - Updated with finalized decisions
const CONFIG = {
  incidentio: {
    square: {
      apiKey: PropertiesService.getScriptProperties().getProperty('SQUARE_API_KEY'),
      baseUrl: 'https://api.incident.io/v2'
    },
    cash: {
      apiKey: PropertiesService.getScriptProperties().getProperty('CASH_API_KEY'),
      baseUrl: 'https://api.incident.io/v2'
    }
  },
  firehydrant: {
    afterpay: {
      apiKey: PropertiesService.getScriptProperties().getProperty('FIREHYDRANT_API_KEY'),
      baseUrl: 'https://api.firehydrant.io/v1'
    }
  }
};

// Incident filtering criteria - Based on finalized decisions
const INCIDENT_FILTERING = {
  // INCLUDE ONLY these statuses
  includeStatuses: [
    'Stabilized',
    'Postmortem Prep', 
    'Postmortem Meeting Prep',
    'Closed'
  ],
  
  // EXCLUDE these statuses
  excludeStatuses: [
    'Declined',
    'Canceled', 
    'Triage'
  ],
  
  // INCLUDE ONLY these incident modes
  includeModes: ['standard', 'retrospective'],
  
  // EXCLUDE these incident types
  excludeTypes: ['[TEST]', '[Preemptive SEV]'],
  
  // Multi-tiered date ranges
  dateRanges: {
    emailFocus: 7,      // Email shows detailed list for last 7 days
    bucket1: 30,        // 7-30 days bucket
    bucket2: 60,        // 30-60 days bucket  
    bucket3: 90         // 90+ days bucket
  }
};

// Google Sheets ID for configuration and logging
const SHEET_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_SHEET_ID') || '1TF0p345-fZaK5PnR2TgsmskxA_OHfGLyUL4Qp3b99Eg';

// Required fields to monitor
const REQUIRED_FIELDS = [
  'Affected Markets',
  'Causal Type',
  'Stabilization Type'
];

/**
 * Create custom menu when spreadsheet opens
 */
function onOpen() {
  createCustomMenu();
}

/**
 * Create custom menu
 */
function createCustomMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔍 Missing Fields Report')
    .addItem('🔄 Check Missing Fields Now', 'runMissingFieldsCheck')
    .addItem('📧 Send Test Email', 'sendTestEmail')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Automation')
      .addItem('🔧 Setup Daily Automation', 'setupDailyAutomation')
      .addItem('🛑 Cancel Daily Automation', 'cancelDailyAutomation')
      .addSeparator()
      .addItem('📊 Show Automation Status', 'showAutomationStatus'))
    .addSeparator()
    .addItem('🔗 Test API Connections', 'testAllApiConnections')
    .addItem('ℹ️ About This Report', 'showAboutDialog')
    .addToUi();
  
  console.log('✅ Custom menu created successfully!');
}

/**
 * Main function - Daily missing fields check
 */
function runMissingFieldsCheck() {
  console.log('🚀 Starting missing fields check...');
  
  try {
    // Get configuration from Google Sheets
    const config = getConfiguration();
    
    // Fetch incidents from all platforms
    const allIncidents = [];
    
    // incident.io - Square and Cash
    const squareIncidents = fetchIncidentsFromIncidentIO('square', config);
    const cashIncidents = fetchIncidentsFromIncidentIO('cash', config);
    
    // FireHydrant - Afterpay
    const afterpayIncidents = fetchIncidentsFromFireHydrant('afterpay', config);
    
    allIncidents.push(...squareIncidents, ...cashIncidents, ...afterpayIncidents);
    
    console.log(`📊 Total incidents fetched: ${allIncidents.length}`);
    
    // Validate required fields
    const incidentsWithMissingFields = validateRequiredFields(allIncidents);
    
    console.log(`⚠️ Incidents with missing fields: ${incidentsWithMissingFields.length}`);
    
    if (incidentsWithMissingFields.length > 0) {
      // Send email notification
      sendMissingFieldsNotification(incidentsWithMissingFields, config);
      
      // Update tracking sheet
      updateTrackingSheet(incidentsWithMissingFields);
    }
    
    // Log execution
    logExecution(allIncidents.length, incidentsWithMissingFields.length);
    
    console.log('✅ Missing fields check completed successfully!');
    
  } catch (error) {
    console.error('❌ Missing fields check failed:', error.toString());
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Automated daily check (no UI calls)
 */
function dailyAutomatedCheck() {
  console.log('📅 Daily automated missing fields check triggered');
  runMissingFieldsCheck();
}

// TODO: Implement remaining functions
// - getConfiguration()
// - fetchIncidentsFromIncidentIO()
// - fetchIncidentsFromFireHydrant()
// - validateRequiredFields()
// - sendMissingFieldsNotification()
// - updateTrackingSheet()
// - logExecution()
// - setupDailyAutomation()
// - cancelDailyAutomation()
// - showAutomationStatus()
// - testAllApiConnections()
// - showAboutDialog()

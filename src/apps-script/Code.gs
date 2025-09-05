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

// Incident filtering criteria - Based on finalized decisions with platform-specific statuses
const INCIDENT_FILTERING = {
  // INCLUDE ONLY these statuses - Platform Specific
  includeStatuses: {
    'incident.io': [
      'Stabilized',
      'Postmortem Prep', 
      'Postmortem Meeting Prep',
      'Closed'
    ],
    'firehydrant': [
      'Stabilized',
      'Remediation',
      'Resolved',
      'Retrospective Started',
      'Retrospective Completed',
      'Closed'
    ]
  },
  
  // EXCLUDE these statuses (common across platforms)
  excludeStatuses: [
    'Declined',
    'Canceled', 
    'Triage'
  ],
  
  // INCLUDE ONLY these incident modes (incident.io only)
  includeModes: ['standard', 'retrospective'],
  
  // EXCLUDE these incident types (common across platforms)
  excludeTypes: ['[TEST]', '[Preemptive SEV]'],
  
  // Multi-tiered date ranges - Updated to match Summary sheet buckets exactly
  dateRanges: {
    emailFocus: 7,      // Email shows detailed list for last 7 days (0-7 days)
    bucket1: 30,        // 7-30 days bucket
    bucket2: 90,        // 30-90 days bucket  
    bucket3: 365,       // 90+ days bucket (up to maxLookback)
    maxLookback: 365    // Total lookback period (12 months)
  }
};

// For sheet-bound script, we'll use SpreadsheetApp.getActiveSpreadsheet() instead of SHEET_ID

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
    .addItem('🐛 Debug Specific Incidents', 'debugSpecificIncidents')
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
      
      // Update summary sheet
      updateSummarySheet(incidentsWithMissingFields);
    } else {
      // Update summary sheet even when no incidents (to show zeros)
      updateSummarySheet([]);
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

/**
 * Test function to update summary sheet with sample data
 */
function testSummaryUpdate() {
  console.log('🧪 Testing summary sheet update...');
  
  try {
    // Create sample incidents for testing
    const sampleIncidents = [
      {
        reference: 'INC-001',
        platform: 'incident.io',
        businessUnit: 'square',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        missingFields: ['Affected Markets']
      },
      {
        reference: 'INC-002',
        platform: 'incident.io',
        businessUnit: 'cash',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        missingFields: ['Causal Type', 'Stabilization Type']
      },
      {
        reference: 'INC-003',
        platform: 'firehydrant',
        businessUnit: 'afterpay',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
        missingFields: ['Affected Markets']
      },
      {
        reference: 'INC-004',
        platform: 'incident.io',
        businessUnit: 'square',
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
        missingFields: ['Stabilization Type']
      }
    ];
    
    updateSummarySheet(sampleIncidents);
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '✅ Summary Sheet Test Complete',
      'Summary sheet has been updated with sample data to test the functionality.\n\n' +
      'Check the Summary tab to see the date bucket breakdown.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Summary sheet test failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Summary Sheet Test Failed',
      `Failed to update summary sheet:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Debug function to investigate specific incidents
 */
function debugSpecificIncidents() {
  console.log('🔍 Debugging specific incidents: INC-4143, INC-4072');
  
  try {
    const config = getConfiguration();
    const squareConfig = CONFIG.incidentio.square;
    
    const incidentIds = ['INC-4143', 'INC-4072'];
    
    for (const incidentId of incidentIds) {
      console.log(`\n📋 Investigating ${incidentId}:`);
      
      try {
        // Fetch the specific incident
        const response = UrlFetchApp.fetch(`${squareConfig.baseUrl}/incidents`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${squareConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.getResponseCode() === 200) {
          const data = JSON.parse(response.getContentText());
          const incident = data.incidents?.find(inc => inc.reference === incidentId);
          
          if (incident) {
            console.log(`✅ Found ${incidentId}:`);
            console.log(`   📅 Created: ${incident.created_at}`);
            console.log(`   📊 Status: ${incident.incident_status?.name || 'Unknown'}`);
            console.log(`   🔄 Mode: ${incident.mode?.name || 'Unknown'}`);
            console.log(`   🏷️ Type: ${incident.incident_type?.name || 'Unknown'}`);
            
            // Check date bucket
            const daysAgo = Math.floor((new Date() - new Date(incident.created_at)) / (1000 * 60 * 60 * 24));
            console.log(`   📆 Days ago: ${daysAgo}`);
            console.log(`   📦 Date bucket: ${daysAgo > 90 ? '90+ days' : daysAgo > 30 ? '30-90 days' : daysAgo > 7 ? '7-30 days' : '0-7 days'}`);
            
            // Check filtering criteria
            const statusIncluded = INCIDENT_FILTERING.includeStatuses['incident.io'].includes(incident.incident_status?.name);
            const modeIncluded = INCIDENT_FILTERING.includeModes.includes(incident.mode?.name);
            const typeExcluded = INCIDENT_FILTERING.excludeTypes.some(excludeType => 
              incident.incident_type?.name?.includes(excludeType)
            );
            
            console.log(`   ✅ Status included: ${statusIncluded} (${incident.incident_status?.name})`);
            console.log(`   ✅ Mode included: ${modeIncluded} (${incident.mode?.name})`);
            console.log(`   ❌ Type excluded: ${typeExcluded} (${incident.incident_type?.name})`);
            console.log(`   🎯 Would be included: ${statusIncluded && modeIncluded && !typeExcluded}`);
            
            // Check field values
            console.log(`   🔍 Field analysis:`);
            const affectedMarkets = getIncidentIOFieldValue(incident, 'Affected Markets');
            const causalType = getIncidentIOFieldValue(incident, 'Causal Type');
            const stabilizationType = getIncidentIOFieldValue(incident, 'Stabilization Type');
            
            console.log(`     📍 Affected Markets: "${affectedMarkets}"`);
            console.log(`     🔍 Causal Type: "${causalType}"`);
            console.log(`     🔧 Stabilization Type: "${stabilizationType}"`);
            
          } else {
            console.log(`❌ ${incidentId} not found in current API results`);
          }
        } else {
          console.log(`❌ API request failed: ${response.getResponseCode()}`);
        }
        
      } catch (error) {
        console.error(`❌ Error investigating ${incidentId}:`, error.toString());
      }
    }
    
    // Show results in UI
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🔍 Debug Complete',
      'Debug investigation complete. Check the Apps Script logs (View > Logs) for detailed results.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Debug function failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Debug Failed',
      `Debug investigation failed:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

// TODO: Implement remaining functions
// - getConfiguration()
// - fetchIncidentsFromIncidentIO()
// - fetchIncidentsFromFireHydrant()
// - validateRequiredFields()
// - sendMissingFieldsNotification()
// - sendTestEmail()
// - logExecution()
// - setupDailyAutomation()
// - cancelDailyAutomation()
// - showAutomationStatus()
// - testAllApiConnections()
// - showAboutDialog()

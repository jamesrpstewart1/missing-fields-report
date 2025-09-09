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
  'Stabilization Type',
  'Impact Start Date',  // New: Impact start timestamp
  'Transcript URL'      // New: Google Meet transcript document
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
    .addSubMenu(ui.createMenu('🔬 Testing & Research')
      .addItem('📊 Research Severity Fields', 'researchSeverityFields')
      .addItem('🧪 Test Severity Filtering', 'testSeverityFiltering')
      .addItem('🔗 Test API Connections', 'testAllApiConnections'))
    .addSeparator()
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

/**
 * Test function to validate new field logic
 */
function testNewFieldValidation() {
  console.log('🧪 Testing new field validation logic...');
  
  try {
    const config = getConfiguration();
    
    // Fetch a small sample of incidents to test
    console.log('--- Fetching sample incidents for validation test ---');
    const squareIncidents = fetchIncidentsFromIncidentIO('square', config);
    
    if (squareIncidents.length === 0) {
      throw new Error('No incidents found for testing');
    }
    
    // Test with first 5 incidents
    const testIncidents = squareIncidents.slice(0, 5);
    console.log(`\n🔍 Testing field validation on ${testIncidents.length} incidents:`);
    
    testIncidents.forEach((incident, index) => {
      console.log(`\n📋 Testing incident ${index + 1}: ${incident.reference}`);
      
      // Test all required fields
      REQUIRED_FIELDS.forEach(fieldName => {
        const fieldValue = getIncidentIOFieldValue(incident, fieldName);
        const hasField = fieldValue && fieldValue.trim().length > 0;
        
        console.log(`   ${hasField ? '✅' : '❌'} ${fieldName}: "${fieldValue}"`);
        
        // Special logging for new fields
        if (fieldName === 'Call URL') {
          console.log(`      📞 Direct call_url: "${incident.call_url || 'NULL'}"`);
        } else if (fieldName === 'Transcript URL') {
          const transcriptValues = getCustomFieldValue(incident, 'Google Meet Transcript');
          console.log(`      📄 Google Meet Transcript custom field: ${JSON.stringify(transcriptValues)}`);
        }
      });
    });
    
    // Run full validation to see results
    console.log('\n🔍 Running full validation on test incidents...');
    const incidentsWithMissingFields = validateRequiredFields(testIncidents);
    
    console.log(`\n📊 VALIDATION RESULTS:`);
    console.log(`   Total incidents tested: ${testIncidents.length}`);
    console.log(`   Incidents with missing fields: ${incidentsWithMissingFields.length}`);
    
    if (incidentsWithMissingFields.length > 0) {
      console.log('\n⚠️ Missing field details:');
      incidentsWithMissingFields.forEach(incident => {
        console.log(`   ${incident.reference}: Missing [${incident.missingFields.join(', ')}]`);
      });
    }
    
    // Show results in UI
    const ui = SpreadsheetApp.getUi();
    const summary = `Validation Test Complete!\n\n` +
      `• Tested ${testIncidents.length} incidents\n` +
      `• Found ${incidentsWithMissingFields.length} with missing fields\n` +
      `• New fields tested: Call URL, Transcript URL\n\n` +
      `Check Apps Script logs for detailed results.`;
    
    ui.alert('🧪 Field Validation Test', summary, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('❌ Field validation test failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Test Failed',
      `Field validation test failed:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Test severity filtering functionality
 */
function testSeverityFiltering() {
  console.log('🧪 Testing severity filtering functionality...');
  
  try {
    const config = getConfiguration();
    
    // Show current severity filtering configuration
    console.log('\n📋 Current Severity Filtering Configuration:');
    console.log(`   Enable Severity Filtering: ${config.enableSeverityFiltering}`);
    console.log(`   incident.io Severities: ${JSON.stringify(config.incidentioSeverities)}`);
    console.log(`   Include Internal Impact: ${config.includeInternalImpact}`);
    console.log(`   FireHydrant Severities: ${JSON.stringify(config.firehydrantSeverities)}`);
    
    // Test with severity filtering disabled (baseline)
    console.log('\n--- Testing with Severity Filtering DISABLED (Baseline) ---');
    const configDisabled = { ...config, enableSeverityFiltering: false };
    
    const squareIncidentsBaseline = fetchIncidentsFromIncidentIO('square', configDisabled);
    const cashIncidentsBaseline = fetchIncidentsFromIncidentIO('cash', configDisabled);
    const afterpayIncidentsBaseline = fetchIncidentsFromFireHydrant('afterpay', configDisabled);
    
    const baselineTotal = squareIncidentsBaseline.length + cashIncidentsBaseline.length + afterpayIncidentsBaseline.length;
    console.log(`📊 Baseline Results (No Severity Filter):`);
    console.log(`   Square: ${squareIncidentsBaseline.length} incidents`);
    console.log(`   Cash: ${cashIncidentsBaseline.length} incidents`);
    console.log(`   Afterpay: ${afterpayIncidentsBaseline.length} incidents`);
    console.log(`   Total: ${baselineTotal} incidents`);
    
    // Test with severity filtering enabled
    if (config.enableSeverityFiltering) {
      console.log('\n--- Testing with Severity Filtering ENABLED ---');
      
      const squareIncidentsFiltered = fetchIncidentsFromIncidentIO('square', config);
      const cashIncidentsFiltered = fetchIncidentsFromIncidentIO('cash', config);
      const afterpayIncidentsFiltered = fetchIncidentsFromFireHydrant('afterpay', config);
      
      const filteredTotal = squareIncidentsFiltered.length + cashIncidentsFiltered.length + afterpayIncidentsFiltered.length;
      console.log(`📊 Filtered Results:`);
      console.log(`   Square: ${squareIncidentsFiltered.length} incidents (${squareIncidentsBaseline.length - squareIncidentsFiltered.length} filtered out)`);
      console.log(`   Cash: ${cashIncidentsFiltered.length} incidents (${cashIncidentsBaseline.length - cashIncidentsFiltered.length} filtered out)`);
      console.log(`   Afterpay: ${afterpayIncidentsFiltered.length} incidents (${afterpayIncidentsBaseline.length - afterpayIncidentsFiltered.length} filtered out)`);
      console.log(`   Total: ${filteredTotal} incidents (${baselineTotal - filteredTotal} filtered out)`);
      
      // Show severity breakdown for sample incidents
      console.log('\n🔍 Sample Severity Analysis:');
      const sampleIncidents = [...squareIncidentsFiltered.slice(0, 3), ...afterpayIncidentsFiltered.slice(0, 2)];
      sampleIncidents.forEach((incident, index) => {
        console.log(`\n   ${index + 1}. ${incident.reference} (${incident.platform}):`);
        if (incident.severity) {
          const severityName = incident.severity.name || incident.severity.value || incident.severity;
          console.log(`      📊 Severity: ${severityName}`);
          console.log(`      ✅ Matches filter: ${incident.platform === 'incident.io' ? 
            matchesIncidentIOSeverity(incident, config.incidentioSeverities, config.includeInternalImpact) :
            matchesFireHydrantSeverity(incident, config.firehydrantSeverities)}`);
        } else {
          console.log(`      ❌ No severity data`);
        }
      });
      
    } else {
      console.log('\n⚠️ Severity filtering is DISABLED in configuration');
      console.log('   To test filtering, set "enableSeverityFiltering" to TRUE in the Config sheet');
    }
    
    // Test specific severity matching functions
    console.log('\n--- Testing Severity Matching Functions ---');
    
    // Test incident.io severity matching
    if (squareIncidentsBaseline.length > 0) {
      const testIncident = squareIncidentsBaseline[0];
      console.log(`\n🔍 Testing incident.io severity matching with: ${testIncident.reference}`);
      if (testIncident.severity) {
        const severityName = testIncident.severity.name;
        console.log(`   Severity: ${severityName}`);
        console.log(`   Matches SEV1,SEV2: ${matchesIncidentIOSeverity(testIncident, ['SEV1', 'SEV2'], true)}`);
        console.log(`   Matches SEV0,SEV1,SEV2,SEV3,SEV4: ${matchesIncidentIOSeverity(testIncident, ['SEV0', 'SEV1', 'SEV2', 'SEV3', 'SEV4'], true)}`);
      }
    }
    
    // Test FireHydrant severity matching
    if (afterpayIncidentsBaseline.length > 0) {
      const testIncident = afterpayIncidentsBaseline[0];
      console.log(`\n🔍 Testing FireHydrant severity matching with: ${testIncident.reference}`);
      if (testIncident.severity) {
        const severityName = testIncident.severity.name || testIncident.severity.value || testIncident.severity;
        console.log(`   Severity: ${severityName}`);
        console.log(`   Matches SEV1,SEV2: ${matchesFireHydrantSeverity(testIncident, ['SEV1', 'SEV2'])}`);
        console.log(`   Matches SEV0,SEV1,SEV2,SEV3,SEV4: ${matchesFireHydrantSeverity(testIncident, ['SEV0', 'SEV1', 'SEV2', 'SEV3', 'SEV4'])}`);
      }
    }
    
    // Show results in UI
    const ui = SpreadsheetApp.getUi();
    const summary = `Severity Filtering Test Complete!\n\n` +
      `📊 Results:\n` +
      `• Baseline (no filter): ${baselineTotal} incidents\n` +
      `• With filtering: ${config.enableSeverityFiltering ? 'Enabled' : 'Disabled'}\n` +
      `• Configuration loaded successfully\n\n` +
      `Check Apps Script logs for detailed analysis.`;
    
    ui.alert('🧪 Severity Filtering Test', summary, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('❌ Severity filtering test failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Test Failed',
      `Severity filtering test failed:\n\n${error.toString()}`,
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

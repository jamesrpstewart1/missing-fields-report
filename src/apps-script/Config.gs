/**
 * Configuration and Utilities Module
 * Handles configuration management and utility functions
 */

/**
 * Get configuration from Google Sheets
 */
function getConfiguration() {
  console.log('📋 Loading configuration from Google Sheets...');
  
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Config');
    
    if (!sheet) {
      console.log('⚠️ Config sheet not found, using default configuration');
      return getDefaultConfiguration();
    }
    
    const data = sheet.getDataRange().getValues();
    const config = {};
    
    // Parse configuration data (assuming Parameter | Value format)
    for (let i = 1; i < data.length; i++) { // Skip header row
      const [parameter, value] = data[i];
      if (parameter && value) {
        config[parameter] = parseConfigValue(value);
      }
    }
    
    console.log('✅ Configuration loaded successfully');
    return { ...getDefaultConfiguration(), ...config };
    
  } catch (error) {
    console.error('❌ Failed to load configuration:', error.toString());
    console.log('⚠️ Using default configuration');
    return getDefaultConfiguration();
  }
}

/**
 * Get default configuration based on finalized decisions
 */
function getDefaultConfiguration() {
  return {
    // Multi-tiered date ranges (all incidents up to 90+ days)
    maxLookbackDays: INCIDENT_FILTERING.dateRanges.bucket3,
    emailFocusDays: INCIDENT_FILTERING.dateRanges.emailFocus,
    
    // Status filtering (INCLUDE ONLY these statuses)
    includeStatuses: INCIDENT_FILTERING.includeStatuses,
    
    // Email configuration
    emailRecipients: ['jamesstewart@squareup.com'], // Development/testing
    
    // Business units
    businessUnits: ['square', 'cash', 'afterpay'],
    
    // Incident filtering
    includeModes: INCIDENT_FILTERING.includeModes,
    excludeTypes: INCIDENT_FILTERING.excludeTypes
  };
}

/**
 * Parse configuration value from string
 */
function parseConfigValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Handle boolean values
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // Handle numeric values
  if (!isNaN(value) && !isNaN(parseFloat(value))) {
    return parseFloat(value);
  }
  
  // Handle comma-separated arrays
  if (value.includes(',')) {
    return value.split(',').map(item => item.trim());
  }
  
  // Handle dates
  if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(value);
  }
  
  return value;
}

/**
 * Update tracking sheet with incidents
 */
function updateTrackingSheet(incidentsWithMissingFields) {
  console.log(`📝 Updating tracking sheet with ${incidentsWithMissingFields.length} incidents...`);
  
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Tracking');
    
    if (!sheet) {
      console.log('⚠️ Tracking sheet not found, skipping tracking update');
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    // Prepare data for tracking sheet
    const trackingData = incidentsWithMissingFields.map(incident => [
      timestamp,
      incident.reference,
      incident.platform,
      incident.businessUnit,
      incident.name || incident.summary || '',
      incident.missingFields.join(', '),
      incident.url,
      new Date(incident.created_at).toLocaleDateString(),
      'Active'
    ]);
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp',
        'Reference',
        'Platform',
        'Business Unit',
        'Summary',
        'Missing Fields',
        'URL',
        'Created Date',
        'Status'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center');
    }
    
    // Add new tracking data
    if (trackingData.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, trackingData.length, trackingData[0].length).setValues(trackingData);
    }
    
    console.log(`✅ Tracking sheet updated with ${trackingData.length} entries`);
    
  } catch (error) {
    console.error('❌ Failed to update tracking sheet:', error.toString());
  }
}

/**
 * Log execution details
 */
function logExecution(totalIncidents, incidentsWithMissingFields) {
  console.log(`📊 Logging execution details...`);
  
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Logs');
    
    if (!sheet) {
      console.log('⚠️ Logs sheet not found, skipping execution logging');
      return;
    }
    
    const timestamp = new Date();
    const executionData = [
      timestamp.toISOString(),
      timestamp.toLocaleDateString(),
      timestamp.toLocaleTimeString(),
      totalIncidents,
      incidentsWithMissingFields,
      incidentsWithMissingFields > 0 ? 'Email Sent' : 'No Action Required',
      'Success'
    ];
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp',
        'Date',
        'Time',
        'Total Incidents',
        'Missing Fields Count',
        'Action Taken',
        'Status'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center');
    }
    
    // Add execution log
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, 1, executionData.length).setValues([executionData]);
    
    console.log(`✅ Execution logged successfully`);
    
  } catch (error) {
    console.error('❌ Failed to log execution:', error.toString());
  }
}

/**
 * Setup daily automation trigger
 */
function setupDailyAutomation() {
  console.log('🔧 Setting up daily automation...');
  
  try {
    // Delete any existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'dailyAutomatedCheck' || 
          trigger.getHandlerFunction() === 'runMissingFieldsCheck') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });
    
    console.log(`🗑️ Deleted ${deletedCount} existing triggers`);
    
    // Create new daily trigger at 9:00 AM
    const trigger = ScriptApp.newTrigger('dailyAutomatedCheck')
      .timeBased()
      .everyDays(1)
      .atHour(9)
      .create();
    
    console.log('✅ Daily automation trigger created successfully!');
    console.log(`   📅 Trigger ID: ${trigger.getUniqueId()}`);
    console.log('   📅 Schedule: Daily at 9:00 AM');
    console.log('   🔄 Function: dailyAutomatedCheck()');
    
    // Show success message
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '✅ Daily Automation Setup Complete',
        `Daily trigger has been successfully created!\n\n` +
        `📅 Schedule: Every day at 9:00 AM\n` +
        `🔄 Function: dailyAutomatedCheck()\n\n` +
        `The system will now automatically check for missing fields and send notifications daily.`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      console.log('⚠️ Could not show UI alert (running in automated context)');
    }
    
    return { success: true, triggerId: trigger.getUniqueId() };
    
  } catch (error) {
    console.error('❌ Failed to setup daily automation:', error.toString());
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Daily Automation Setup Failed',
        `Failed to create daily trigger:\n\n${error.toString()}`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      console.log('⚠️ Could not show error UI alert');
    }
    
    throw error;
  }
}

/**
 * Cancel daily automation
 */
function cancelDailyAutomation() {
  console.log('🛑 Canceling daily automation...');
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const automationTriggers = triggers.filter(trigger => 
      trigger.getHandlerFunction() === 'dailyAutomatedCheck' ||
      trigger.getHandlerFunction() === 'runMissingFieldsCheck'
    );
    
    if (automationTriggers.length === 0) {
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert(
          'ℹ️ No Automation Found',
          'No daily automation triggers are currently active.',
          ui.ButtonSet.OK
        );
      } catch (uiError) {
        console.log('⚠️ Could not show UI alert');
      }
      return { success: true, deletedCount: 0 };
    }
    
    let deletedCount = 0;
    automationTriggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      deletedCount++;
      console.log(`🗑️ Deleted trigger: ${trigger.getHandlerFunction()}`);
    });
    
    console.log(`✅ Successfully deleted ${deletedCount} automation triggers`);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '✅ Daily Automation Canceled',
        `Successfully canceled daily automation!\n\nDeleted ${deletedCount} trigger(s).`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      console.log('⚠️ Could not show UI alert');
    }
    
    return { success: true, deletedCount: deletedCount };
    
  } catch (error) {
    console.error('❌ Failed to cancel daily automation:', error.toString());
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Automation Cancellation Failed',
        `Failed to cancel daily automation:\n\n${error.toString()}`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      console.log('⚠️ Could not show error UI alert');
    }
    
    throw error;
  }
}

/**
 * Show automation status
 */
function showAutomationStatus() {
  console.log('📊 Checking automation status...');
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const relevantTriggers = triggers.filter(trigger => 
      trigger.getHandlerFunction() === 'dailyAutomatedCheck' ||
      trigger.getHandlerFunction() === 'runMissingFieldsCheck'
    );
    
    let statusMessage = 'Missing Fields Report Automation Status\n\n';
    
    if (relevantTriggers.length === 0) {
      statusMessage += '❌ No automation triggers found\n\n';
      statusMessage += 'Click "Setup Daily Automation" to create the daily trigger.';
    } else {
      statusMessage += `✅ ${relevantTriggers.length} automation trigger(s) active:\n\n`;
      
      relevantTriggers.forEach((trigger, index) => {
        statusMessage += `${index + 1}. Function: ${trigger.getHandlerFunction()}\n`;
        statusMessage += `   Type: ${trigger.getEventType()}\n`;
        statusMessage += `   ID: ${trigger.getUniqueId()}\n\n`;
      });
      
      statusMessage += 'The system will automatically check for missing fields daily.';
    }
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('📊 Automation Status', statusMessage, ui.ButtonSet.OK);
    
    return { triggerCount: relevantTriggers.length, triggers: relevantTriggers };
    
  } catch (error) {
    console.error('❌ Failed to check automation status:', error.toString());
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Status Check Failed',
        `Unable to check automation status:\n\n${error.toString()}`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      console.log('⚠️ Could not show error UI alert');
    }
    
    throw error;
  }
}

/**
 * Test all API connections
 */
function testAllApiConnections() {
  console.log('🔗 Testing all API connections...');
  
  try {
    let results = {
      'incident.io Square': '❌ Failed',
      'incident.io Cash': '❌ Failed',
      'FireHydrant Afterpay': '❌ Failed'
    };
    
    // Test incident.io Square
    try {
      const squareConfig = CONFIG.incidentio.square;
      if (squareConfig.apiKey) {
        const response = UrlFetchApp.fetch(`${squareConfig.baseUrl}/incidents?page_size=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${squareConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.getResponseCode() === 200) {
          results['incident.io Square'] = '✅ Connected';
        }
      }
    } catch (error) {
      console.error('Square API test failed:', error.toString());
    }
    
    // Test incident.io Cash
    try {
      const cashConfig = CONFIG.incidentio.cash;
      if (cashConfig.apiKey) {
        const response = UrlFetchApp.fetch(`${cashConfig.baseUrl}/incidents?page_size=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cashConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.getResponseCode() === 200) {
          results['incident.io Cash'] = '✅ Connected';
        }
      }
    } catch (error) {
      console.error('Cash API test failed:', error.toString());
    }
    
    // Test FireHydrant Afterpay
    try {
      const afterpayConfig = CONFIG.firehydrant.afterpay;
      if (afterpayConfig.apiKey) {
        const response = UrlFetchApp.fetch(`${afterpayConfig.baseUrl}/incidents?page=1&per_page=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${afterpayConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.getResponseCode() === 200) {
          results['FireHydrant Afterpay'] = '✅ Connected';
        }
      }
    } catch (error) {
      console.error('FireHydrant API test failed:', error.toString());
    }
    
    // Show results
    let message = 'API Connection Test Results:\n\n';
    Object.entries(results).forEach(([platform, status]) => {
      message += `${platform}: ${status}\n`;
    });
    
    const allConnected = Object.values(results).every(status => status.includes('✅'));
    message += `\n${allConnected ? '🎉 All connections working!' : '⚠️ Some connections failed. Check API keys.'}`;
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('🔗 API Connection Test', message, ui.ButtonSet.OK);
    
    return results;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.toString());
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Connection Test Failed',
        `Unable to test API connections:\n\n${error.toString()}`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      console.log('⚠️ Could not show error UI alert');
    }
    
    throw error;
  }
}

/**
 * Show about dialog
 */
function showAboutDialog() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'Missing Fields Report System',
    'This system automatically monitors incidents across incident.io and FireHydrant platforms for missing required fields.\n\n' +
    '• Checks for missing: Affected Markets, Causal Type, Stabilization Type\n' +
    '• Sends daily email notifications\n' +
    '• Tracks incidents until fields are completed\n' +
    '• Supports Square, Cash, and Afterpay business units\n\n' +
    'Use "Check Missing Fields Now" for manual checks or "Setup Daily Automation" for automated daily reports.',
    ui.ButtonSet.OK
  );
}

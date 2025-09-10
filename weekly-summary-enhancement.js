/**
 * Weekly Summary Report Enhancement
 * 
 * This file contains the new weekly summary functionality to be added to Code.gs
 * 
 * Features:
 * - Count of incidents opened in the past week
 * - Percentage completion of essential fields
 * - Business unit breakdown
 * - Weekly email summary
 * - Weekly automation setup
 */

// =============================================================================
// WEEKLY SUMMARY REPORT FUNCTIONS - ADD TO Code.gs
// =============================================================================

/**
 * Main function - Weekly summary report
 * Generates a summary of incidents opened in the past week and field completion rates
 */
function runWeeklySummaryReport() {
  console.log('📊 Starting weekly summary report...');
  
  try {
    // Calculate date range for the past week (7 days)
    const endDate = new Date();
    const startDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    
    console.log(`📅 Weekly period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    // Get configuration
    const config = getConfiguration();
    
    // Override with weekly date range
    config.customDateRange = true;
    config.dateRangeType = 'weekly_summary';
    config.startDate = startDate;
    config.endDate = endDate;
    
    // Fetch incidents from all platforms for the past week
    const allIncidents = [];
    
    // incident.io - Square and Cash
    const squareIncidents = fetchIncidentsFromIncidentIOWithDateRange('square', config);
    const cashIncidents = fetchIncidentsFromIncidentIOWithDateRange('cash', config);
    
    // FireHydrant - Afterpay
    const afterpayIncidents = fetchIncidentsFromFireHydrantWithDateRange('afterpay', config);
    
    allIncidents.push(...squareIncidents, ...cashIncidents, ...afterpayIncidents);
    
    console.log(`📊 Total incidents opened this week: ${allIncidents.length}`);
    
    // Validate required fields to determine completion rates
    const incidentsWithMissingFields = validateRequiredFields(allIncidents);
    const incidentsWithCompleteFields = allIncidents.filter(incident => 
      !incidentsWithMissingFields.some(missing => missing.reference === incident.reference)
    );
    
    console.log(`✅ Incidents with complete fields: ${incidentsWithCompleteFields.length}`);
    console.log(`⚠️ Incidents with missing fields: ${incidentsWithMissingFields.length}`);
    
    // Generate weekly summary metrics
    const weeklySummary = generateWeeklySummary(allIncidents, incidentsWithMissingFields, incidentsWithCompleteFields);
    
    // Send weekly summary email
    sendWeeklySummaryEmail(weeklySummary, config);
    
    // Update summary sheet with weekly context (optional)
    updateSummarySheetWithWeeklySummary(weeklySummary, config);
    
    // Log weekly execution
    logWeeklyExecution(weeklySummary);
    
    console.log('✅ Weekly summary report completed successfully!');
    
    // Show completion message if run manually
    if (typeof SpreadsheetApp !== 'undefined') {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '✅ Weekly Summary Complete',
        `Weekly summary report completed!\n\n` +
        `📊 WEEKLY METRICS:\n` +
        `• Total incidents opened: ${weeklySummary.totalIncidents}\n` +
        `• Complete fields: ${weeklySummary.completeIncidents} (${weeklySummary.completionPercentage}%)\n` +
        `• Missing fields: ${weeklySummary.incompleteIncidents} (${weeklySummary.incompletionPercentage}%)\n\n` +
        `📧 Weekly summary email sent to configured recipients.\n` +
        `📅 Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    console.error('❌ Weekly summary report failed:', error.toString());
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Generate weekly summary metrics
 */
function generateWeeklySummary(allIncidents, incidentsWithMissingFields, incidentsWithCompleteFields) {
  console.log('📊 Generating weekly summary metrics...');
  
  const totalIncidents = allIncidents.length;
  const completeIncidents = incidentsWithCompleteFields.length;
  const incompleteIncidents = incidentsWithMissingFields.length;
  
  // Calculate percentages
  const completionPercentage = totalIncidents > 0 ? 
    ((completeIncidents / totalIncidents) * 100).toFixed(1) : '0.0';
  const incompletionPercentage = totalIncidents > 0 ? 
    ((incompleteIncidents / totalIncidents) * 100).toFixed(1) : '0.0';
  
  // Business unit breakdown
  const businessUnitBreakdown = {
    'Square': { total: 0, complete: 0, incomplete: 0 },
    'Cash': { total: 0, complete: 0, incomplete: 0 },
    'Afterpay': { total: 0, complete: 0, incomplete: 0 }
  };
  
  // Count by business unit
  allIncidents.forEach(incident => {
    const businessUnit = incident.businessUnit;
    if (businessUnitBreakdown[businessUnit]) {
      businessUnitBreakdown[businessUnit].total++;
      
      // Check if this incident has missing fields
      const hasMissingFields = incidentsWithMissingFields.some(missing => 
        missing.reference === incident.reference
      );
      
      if (hasMissingFields) {
        businessUnitBreakdown[businessUnit].incomplete++;
      } else {
        businessUnitBreakdown[businessUnit].complete++;
      }
    }
  });
  
  // Calculate completion percentages by business unit
  Object.keys(businessUnitBreakdown).forEach(unit => {
    const unitData = businessUnitBreakdown[unit];
    unitData.completionPercentage = unitData.total > 0 ? 
      ((unitData.complete / unitData.total) * 100).toFixed(1) : '0.0';
  });
  
  // Top missing fields analysis
  const fieldCounts = {};
  incidentsWithMissingFields.forEach(incident => {
    incident.missingFields.forEach(field => {
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });
  });
  
  const topMissingFields = Object.entries(fieldCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([field, count]) => ({ field, count }));
  
  const summary = {
    // Date range
    startDate: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
    endDate: new Date(),
    
    // Overall metrics
    totalIncidents,
    completeIncidents,
    incompleteIncidents,
    completionPercentage: parseFloat(completionPercentage),
    incompletionPercentage: parseFloat(incompletionPercentage),
    
    // Business unit breakdown
    businessUnitBreakdown,
    
    // Field analysis
    topMissingFields,
    
    // Raw data for email template
    allIncidents,
    incidentsWithMissingFields,
    incidentsWithCompleteFields
  };
  
  console.log(`📊 Weekly summary generated:`);
  console.log(`   Total incidents: ${totalIncidents}`);
  console.log(`   Complete: ${completeIncidents} (${completionPercentage}%)`);
  console.log(`   Incomplete: ${incompleteIncidents} (${incompletionPercentage}%)`);
  
  return summary;
}

/**
 * Automated weekly check (no UI calls)
 */
function weeklyAutomatedSummary() {
  console.log('📅 Weekly automated summary report triggered');
  runWeeklySummaryReport();
}

/**
 * Setup weekly automation trigger
 */
function setupWeeklyAutomation() {
  console.log('🔧 Setting up weekly automation...');
  
  try {
    // Cancel any existing weekly triggers first
    cancelWeeklyAutomation();
    
    // Create new weekly trigger - runs every Monday at 9:00 AM
    const trigger = ScriptApp.newTrigger('weeklyAutomatedSummary')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(9)
      .create();
    
    console.log(`✅ Weekly automation setup complete. Trigger ID: ${trigger.getUniqueId()}`);
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '✅ Weekly Automation Setup Complete',
      `Weekly summary report automation has been configured!\n\n` +
      `📅 Schedule: Every Monday at 9:00 AM\n` +
      `📊 Report: Weekly incident summary with field completion rates\n` +
      `📧 Email: Sent to configured recipients\n\n` +
      `Trigger ID: ${trigger.getUniqueId()}\n\n` +
      `The first report will be sent next Monday.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Weekly automation setup failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Weekly Automation Setup Failed',
      `Failed to setup weekly automation:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Cancel weekly automation trigger
 */
function cancelWeeklyAutomation() {
  console.log('🛑 Canceling weekly automation...');
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let canceledCount = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'weeklyAutomatedSummary') {
        ScriptApp.deleteTrigger(trigger);
        canceledCount++;
        console.log(`🗑️ Canceled weekly trigger: ${trigger.getUniqueId()}`);
      }
    });
    
    console.log(`✅ Weekly automation canceled. Removed ${canceledCount} triggers.`);
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '✅ Weekly Automation Canceled',
      `Weekly automation has been canceled.\n\n` +
      `• Removed ${canceledCount} weekly triggers\n` +
      `• No more weekly summary emails will be sent\n` +
      `• Daily reports continue as normal\n\n` +
      `You can re-enable weekly reports anytime using the menu.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Weekly automation cancel failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Weekly Automation Cancel Failed',
      `Failed to cancel weekly automation:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Show weekly automation status
 */
function showWeeklyAutomationStatus() {
  console.log('📊 Checking weekly automation status...');
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const weeklyTriggers = triggers.filter(trigger => 
      trigger.getHandlerFunction() === 'weeklyAutomatedSummary'
    );
    
    let statusMessage;
    
    if (weeklyTriggers.length === 0) {
      statusMessage = `❌ WEEKLY AUTOMATION: DISABLED\n\n` +
        `• No weekly triggers found\n` +
        `• Weekly summary reports are not scheduled\n` +
        `• Use "Setup Weekly Automation" to enable`;
    } else {
      const trigger = weeklyTriggers[0];
      const nextExecution = trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK ? 
        'Next Monday at 9:00 AM' : 'Unknown';
      
      statusMessage = `✅ WEEKLY AUTOMATION: ENABLED\n\n` +
        `• Active weekly triggers: ${weeklyTriggers.length}\n` +
        `• Schedule: Every Monday at 9:00 AM\n` +
        `• Next execution: ${nextExecution}\n` +
        `• Trigger ID: ${trigger.getUniqueId()}\n\n` +
        `Weekly summary reports are automatically sent.`;
    }
    
    // Also check daily automation status for comparison
    const dailyTriggers = triggers.filter(trigger => 
      trigger.getHandlerFunction() === 'dailyAutomatedCheck'
    );
    
    statusMessage += `\n\n📅 DAILY AUTOMATION: ${dailyTriggers.length > 0 ? 'ENABLED' : 'DISABLED'}\n` +
      `• Active daily triggers: ${dailyTriggers.length}`;
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('📊 Automation Status', statusMessage, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('❌ Weekly automation status check failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Status Check Failed',
      `Failed to check weekly automation status:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Log weekly execution
 */
function logWeeklyExecution(weeklySummary) {
  console.log('📝 Logging weekly execution...');
  
  try {
    // You can extend this to log to a separate sheet or the existing log
    console.log(`📊 WEEKLY SUMMARY LOG:`);
    console.log(`   Date Range: ${weeklySummary.startDate.toLocaleDateString()} to ${weeklySummary.endDate.toLocaleDateString()}`);
    console.log(`   Total Incidents: ${weeklySummary.totalIncidents}`);
    console.log(`   Complete: ${weeklySummary.completeIncidents} (${weeklySummary.completionPercentage}%)`);
    console.log(`   Incomplete: ${weeklySummary.incompleteIncidents} (${weeklySummary.incompletionPercentage}%)`);
    console.log(`   Business Units: Square(${weeklySummary.businessUnitBreakdown.Square.total}), Cash(${weeklySummary.businessUnitBreakdown.Cash.total}), Afterpay(${weeklySummary.businessUnitBreakdown.Afterpay.total})`);
    
  } catch (error) {
    console.error('❌ Weekly execution logging failed:', error.toString());
  }
}

/**
 * Update summary sheet with weekly context (optional)
 */
function updateSummarySheetWithWeeklySummary(weeklySummary, config) {
  console.log('📊 Updating summary sheet with weekly context...');
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Summary');
    
    if (!sheet) {
      console.log('⚠️ Summary sheet not found - skipping weekly update');
      return;
    }
    
    // Add weekly summary section (you can customize the location)
    // This is optional - you might prefer to keep weekly separate from daily
    
    // For now, just log the weekly metrics
    console.log('📊 Weekly summary metrics available for sheet update');
    
  } catch (error) {
    console.error('❌ Weekly summary sheet update failed:', error.toString());
  }
}

// =============================================================================
// UPDATED MENU SYSTEM - REPLACE createCustomMenu() in Code.gs
// =============================================================================

/**
 * Create custom menu with weekly summary options
 * REPLACE the existing createCustomMenu() function in Code.gs with this version
 */
function createCustomMenuWithWeekly() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔍 Missing Fields Report')
    .addItem('🔄 Check Missing Fields Now', 'runMissingFieldsCheck')
    .addSeparator()
    .addSubMenu(ui.createMenu('📊 Weekly Summary Report')
      .addItem('📊 Generate Weekly Summary Now', 'runWeeklySummaryReport')
      .addSeparator()
      .addItem('🔧 Setup Weekly Automation', 'setupWeeklyAutomation')
      .addItem('🛑 Cancel Weekly Automation', 'cancelWeeklyAutomation')
      .addItem('📊 Show Weekly Status', 'showWeeklyAutomationStatus'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📅 Custom Date Ranges')
      .addItem('📅 Run with Custom Dates', 'runWithCustomDates')
      .addItem('📆 Run with Preset Range', 'runWithPresetRange'))
    .addSeparator()
    .addItem('📧 Send Test Email', 'sendTestEmail')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Automation')
      .addItem('🔧 Setup Daily Automation', 'setupDailyAutomation')
      .addItem('🛑 Cancel Daily Automation', 'cancelDailyAutomation')
      .addSeparator()
      .addItem('📊 Show Automation Status', 'showAutomationStatus'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🔬 Testing & Development')
      .addItem('🔗 Test API Connections', 'testAllApiConnections'))
    .addSeparator()
    .addItem('ℹ️ About This Report', 'showAboutDialog')
    .addToUi();
  
  console.log('✅ Custom menu with weekly summary created successfully!');
}

// =============================================================================
// WEEKLY EMAIL TEMPLATE - ADD TO EmailService.gs
// =============================================================================

/**
 * Send weekly summary email
 * This function should be added to EmailService.gs
 */
function sendWeeklySummaryEmail(weeklySummary, config) {
  console.log('📧 Sending weekly summary email...');
  
  try {
    const emailContent = buildWeeklySummaryEmailContent(weeklySummary, config);
    
    // Get email recipients from config
    const recipients = config.emailRecipients || 'your-email@example.com';
    
    // Send email
    MailApp.sendEmail({
      to: recipients,
      subject: `📊 Weekly Incident Summary - ${weeklySummary.startDate.toLocaleDateString()} to ${weeklySummary.endDate.toLocaleDateString()}`,
      htmlBody: emailContent.html,
      attachments: []
    });
    
    console.log(`✅ Weekly summary email sent to: ${recipients}`);
    
  } catch (error) {
    console.error('❌ Weekly summary email failed:', error.toString());
    throw error;
  }
}

/**
 * Build weekly summary email content
 * This function should be added to EmailService.gs
 */
function buildWeeklySummaryEmailContent(weeklySummary, config) {
  console.log('📧 Building weekly summary email content...');
  
  const startDate = weeklySummary.startDate.toLocaleDateString();
  const endDate = weeklySummary.endDate.toLocaleDateString();
  
  // Build business unit rows
  let businessUnitRows = '';
  Object.entries(weeklySummary.businessUnitBreakdown).forEach(([unit, data]) => {
    const unitColor = unit === 'Square' ? '#1f77b4' : 
                     unit === 'Cash' ? '#ff7f0e' : '#2ca02c';
    
    businessUnitRows += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${unitColor};">
          ${unit}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          ${data.total}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #28a745;">
          ${data.complete}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #dc3545;">
          ${data.incomplete}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">
          ${data.completionPercentage}%
        </td>
      </tr>
    `;
  });
  
  // Build top missing fields
  let topFieldsRows = '';
  weeklySummary.topMissingFields.forEach(({ field, count }) => {
    topFieldsRows += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${field}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count}</td>
      </tr>
    `;
  });
  
  if (topFieldsRows === '') {
    topFieldsRows = `
      <tr>
        <td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #28a745;">
          🎉 All incidents have complete fields!
        </td>
      </tr>
    `;
  }
  
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .metric-card { background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .metric-large { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .metric-label { font-size: 14px; color: #666; }
          table { border-collapse: collapse; width: 100%; margin: 15px 0; }
          th { background-color: #f8f9fa; padding: 10px; border: 1px solid #ddd; text-align: left; }
          .success { color: #28a745; }
          .warning { color: #ffc107; }
          .danger { color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Weekly Incident Summary Report</h1>
          <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="metric-card">
          <h2>📈 Executive Summary</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 20px;">
            <div style="flex: 1; min-width: 200px;">
              <div class="metric-large">${weeklySummary.totalIncidents}</div>
              <div class="metric-label">Total Incidents Opened</div>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <div class="metric-large success">${weeklySummary.completionPercentage}%</div>
              <div class="metric-label">Field Completion Rate</div>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <div class="metric-large success">${weeklySummary.completeIncidents}</div>
              <div class="metric-label">Complete Incidents</div>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <div class="metric-large ${weeklySummary.incompleteIncidents > 0 ? 'danger' : 'success'}">${weeklySummary.incompleteIncidents}</div>
              <div class="metric-label">Incomplete Incidents</div>
            </div>
          </div>
        </div>
        
        <div class="metric-card">
          <h2>🏢 Business Unit Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Business Unit</th>
                <th>Total Incidents</th>
                <th>Complete Fields</th>
                <th>Missing Fields</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              ${businessUnitRows}
            </tbody>
          </table>
        </div>
        
        ${weeklySummary.topMissingFields.length > 0 ? `
        <div class="metric-card">
          <h2>⚠️ Top Missing Fields</h2>
          <table>
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Missing Count</th>
              </tr>
            </thead>
            <tbody>
              ${topFieldsRows}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div class="metric-card">
          <h2>📋 Required Fields Monitored</h2>
          <ul>
            <li><strong>Affected Markets</strong> - Geographic impact areas</li>
            <li><strong>Causal Type</strong> - Root cause classification</li>
            <li><strong>Stabilization Type</strong> - Resolution method</li>
            <li><strong>Impact Start Date</strong> - When impact began</li>
            <li><strong>Transcript URL</strong> - Meeting documentation</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666;">
          <p><strong>About this report:</strong> This weekly summary shows incidents opened in the past 7 days and their field completion status. The goal is to track our progress in maintaining complete incident documentation.</p>
          <p><strong>Next steps:</strong> For incidents with missing fields, please update them in your respective incident management platforms (incident.io or FireHydrant).</p>
        </div>
      </body>
    </html>
  `;
  
  return { html };
}

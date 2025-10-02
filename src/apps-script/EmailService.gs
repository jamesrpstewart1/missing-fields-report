/**
 * Email Service Module
 * Handles email notifications for missing fields
 */

/**
 * Send missing fields notification email with multi-tiered approach
 */
function sendMissingFieldsNotification(incidentsWithMissingFields, config) {
  console.log(`📧 Sending missing fields notification for ${incidentsWithMissingFields.length} incidents...`);
  
  try {
    const recipients = getEmailRecipients(config);
    if (!recipients || recipients.length === 0) {
      console.log('⚠️ No email recipients configured, skipping email notification');
      return;
    }
    
    // Categorize incidents by date buckets for multi-tiered reporting
    const buckets = categorizeIncidentsByDateBuckets(incidentsWithMissingFields);
    
    // Generate summary for all incidents
    const summary = getMissingFieldsSummary(incidentsWithMissingFields);
    
    // Generate email content with tiered approach
    const emailContent = generateTieredEmailContent(buckets, summary);
    
    // Subject focuses on recent incidents (email focus bucket)
    const recentCount = buckets.emailFocus.length;
    const subject = `Missing Fields Report - ${recentCount} Recent Incident${recentCount !== 1 ? 's' : ''} Need Attention`;
    
    // Send email
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: subject,
      htmlBody: emailContent.html,
      attachments: []
    });
    
    console.log(`✅ Email sent successfully to ${recipients.length} recipient(s)`);
    console.log(`   📊 Email focus (0-${INCIDENT_FILTERING.dateRanges.emailFocus} days): ${buckets.emailFocus.length} incidents`);
    console.log(`   📊 Older incidents summarized: ${buckets.bucket1.length + buckets.bucket2.length + buckets.bucket3.length} incidents`);
    
  } catch (error) {
    console.error('❌ Failed to send email notification:', error.toString());
    throw error;
  }
}

/**
 * Send test email
 */
function sendTestEmail() {
  console.log('📧 Sending test email...');
  
  try {
    const config = getConfiguration();
    const recipients = getEmailRecipients(config);
    
    if (!recipients || recipients.length === 0) {
      throw new Error('No email recipients configured');
    }
    
    const testIncident = {
      reference: 'TEST-001',
      name: 'Test Incident for Missing Fields Report',
      platform: 'incident.io',
      businessUnit: 'square',
      url: 'https://example.com/test-incident',
      created_at: new Date().toISOString(),
      missingFields: ['Affected Markets', 'Causal Type']
    };
    
    const summary = {
      totalIncidents: 1,
      fieldCounts: {
        'Affected Markets': 1,
        'Causal Type': 1,
        'Stabilization Type': 0
      },
      platformCounts: {
        'incident.io': 1
      },
      businessUnitCounts: {
        'square': 1
      }
    };
    
    const emailContent = generateEmailContent([testIncident], summary, true);
    
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: 'TEST - Missing Fields Report System',
      htmlBody: emailContent.html
    });
    
    console.log(`✅ Test email sent successfully to ${recipients.length} recipient(s)`);
    
    // Show success message if called from UI
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '✅ Test Email Sent',
        `Test email sent successfully to:\n${recipients.join('\n')}\n\nCheck your inbox to verify email delivery.`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      // Running in automated context, no UI available
    }
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error.toString());
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Test Email Failed',
        `Failed to send test email:\n\n${error.toString()}`,
        ui.ButtonSet.OK
      );
    } catch (uiError) {
      // Running in automated context, no UI available
    }
    
    throw error;
  }
}

/**
 * Get email recipients from configuration
 */
function getEmailRecipients(config) {
  // Try to get from configuration first
  if (config.emailRecipients) {
    // Handle both string and array formats
    if (Array.isArray(config.emailRecipients)) {
      return config.emailRecipients.filter(email => email && email.trim());
    } else if (typeof config.emailRecipients === 'string') {
      return config.emailRecipients.split(',').map(email => email.trim()).filter(email => email);
    }
  }
  
  // Fallback to script properties
  const recipientsString = PropertiesService.getScriptProperties().getProperty('EMAIL_RECIPIENTS');
  if (recipientsString) {
    return recipientsString.split(',').map(email => email.trim()).filter(email => email);
  }
  
  return [];
}

/**
 * Generate HTML email content
 */
function generateEmailContent(incidentsWithMissingFields, summary, isTest = false) {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  let html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #d73027; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .incident { border: 1px solid #dee2e6; border-radius: 5px; margin-bottom: 15px; padding: 15px; }
        .incident-header { font-weight: bold; color: #495057; margin-bottom: 10px; }
        .missing-fields { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 3px; padding: 8px; margin-top: 10px; }
        .field-tag { background-color: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
        .platform-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-square { background-color: #000000; color: white; }
        .badge-cash { background-color: #28a745; color: white; }
        .badge-afterpay { background-color: #007bff; color: white; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔍 Missing Fields Report${isTest ? ' - TEST' : ''}</h2>
            <p>Generated on ${currentDate} at ${currentTime}</p>
        </div>
`;

  if (isTest) {
    html += `
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-top: 0;">✅ Test Email</h3>
            <p style="color: #155724; margin-bottom: 0;">This is a test email to verify the Missing Fields Report system is working correctly. If you received this email, the system is configured properly.</p>
        </div>
`;
  }

  // Summary section
  html += `
        <div class="summary">
            <h3>📊 Summary</h3>
            <table>
                <tr><th>Total Incidents with Missing Fields</th><td><strong>${summary.totalIncidents}</strong></td></tr>
`;

  // Missing fields breakdown
  html += '<tr><th>Missing Fields Breakdown</th><td>';
  Object.entries(summary.fieldCounts).forEach(([field, count]) => {
    if (count > 0) {
      html += `<span class="field-tag">${field}: ${count}</span>`;
    }
  });
  html += '</td></tr>';

  // Platform breakdown
  html += '<tr><th>By Platform</th><td>';
  Object.entries(summary.platformCounts).forEach(([platform, count]) => {
    html += `<span class="platform-badge">${platform}: ${count}</span> `;
  });
  html += '</td></tr>';

  // Brand breakdown
  html += '<tr><th>By Brand</th><td>';
  Object.entries(summary.businessUnitCounts).forEach(([bu, count]) => {
    html += `<span class="platform-badge">${bu}: ${count}</span> `;
  });
  html += '</td></tr>';

  html += `
            </table>
        </div>

        <h3>📋 Incidents Requiring Attention</h3>
`;

  // Individual incidents
  incidentsWithMissingFields.forEach(incident => {
    const createdDate = new Date(incident.created_at).toLocaleDateString();
    const platformBadge = incident.platform === 'incident.io' ? 'incident.io' : 'FireHydrant';
    
    html += `
        <div class="incident">
            <div class="incident-header">
                <a href="${incident.url}" target="_blank">${incident.reference}</a>
                <span class="platform-badge">${platformBadge} - ${incident.businessUnit}</span>
            </div>
            <p><strong>Summary:</strong> ${incident.name || incident.summary || 'No summary available'}</p>
            <p><strong>Created:</strong> ${createdDate}</p>
            <div class="missing-fields">
                <strong>Missing Fields:</strong>
`;
    
    incident.missingFields.forEach(field => {
      html += `<span class="field-tag">${field}</span>`;
    });
    
    html += `
            </div>
        </div>
`;
  });

  html += `
        <div class="footer">
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Click on incident references to open them directly</li>
                <li>Update the missing fields as indicated</li>
                <li>Incidents will be removed from future reports once fields are completed</li>
            </ul>
            <hr>
            <p>This is an automated report from the Missing Fields Report system. For questions or issues, please contact the platform team.</p>
        </div>
    </div>
</body>
</html>
`;

  return {
    html: html,
    text: generatePlainTextContent(incidentsWithMissingFields, summary, isTest)
  };
}

/**
 * Generate tiered email content with focus on recent incidents
 */
function generateTieredEmailContent(buckets, summary) {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  let html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #d73027; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .bucket-summary { background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #007bff; }
        .incident { border: 1px solid #dee2e6; border-radius: 5px; margin-bottom: 15px; padding: 15px; }
        .incident-header { font-weight: bold; color: #495057; margin-bottom: 10px; }
        .missing-fields { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 3px; padding: 8px; margin-top: 10px; }
        .field-tag { background-color: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
        .platform-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-square { background-color: #000000; color: white; }
        .badge-cash { background-color: #28a745; color: white; }
        .badge-afterpay { background-color: #007bff; color: white; }
        .bucket-count { background-color: #6c757d; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-right: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔍 Missing Fields Report</h2>
            <p>Generated on ${currentDate} at ${currentTime}</p>
        </div>

        <div class="summary">
            <h3>📊 Summary</h3>
            <table>
                <tr><th>Recent Incidents (Last ${INCIDENT_FILTERING.dateRanges.emailFocus} Days)</th><td><strong>${buckets.emailFocus.length}</strong></td></tr>
                <tr><th>Total Incidents Tracked</th><td><strong>${summary.totalIncidents}</strong></td></tr>`;
  
  // Add lookback period information
  const config = getConfiguration();
  const lookbackPeriodSummary = getLookbackPeriodSummary(config);
  html += `<tr><th>Data Period</th><td>${lookbackPeriodSummary.summary}</td></tr>`;
  
  // Add Missing Fields Breakdown (NEW - matching custom date range email)
  if (Object.keys(summary.fieldCounts).length > 0) {
    html += '<tr><th>Missing Fields Breakdown</th><td>';
    Object.entries(summary.fieldCounts).forEach(([field, count]) => {
      if (count > 0) {
        html += `<span class="field-tag">${field}: ${count}</span>`;
      }
    });
    html += '</td></tr>';
  }
  
  // Add severity filtering information
  const severityFilterInfo = getSeverityFilteringSummary(config);
  html += `<tr><th>Severity Filtering</th><td>${severityFilterInfo.status}</td></tr>`;
  if (config.enableSeverityFiltering) {
    html += `<tr><th>Severity Criteria</th><td>${severityFilterInfo.criteria}</td></tr>`;
  }

  // Add business unit breakdown for recent incidents
  if (buckets.emailFocus.length > 0) {
    const recentBusinessUnits = {};
    buckets.emailFocus.forEach(incident => {
      const bu = incident.businessUnit;
      recentBusinessUnits[bu] = (recentBusinessUnits[bu] || 0) + 1;
    });
    
    html += `<tr><th>Recent by Brand</th><td>`;
    Object.entries(recentBusinessUnits).forEach(([bu, count]) => {
      const badgeClass = bu.toLowerCase() === 'square' ? 'badge-square' : 
                        bu.toLowerCase() === 'cash' ? 'badge-cash' : 'badge-afterpay';
      html += `<span class="platform-badge ${badgeClass}">${bu}: ${count}</span> `;
    });
    html += `</td></tr>`;
  }
  
  html += `
            </table>
        </div>
`;

  // Show bucket summary if there are older incidents
  if (buckets.bucket1.length > 0 || buckets.bucket2.length > 0 || buckets.bucket3.length > 0) {
    // Get the spreadsheet URL for the hyperlink
    const spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    
    // Get available age buckets based on lookback period
    const availableBuckets = getAvailableAgeBuckets(config.maxLookbackDays);
    
    html += `
        <div class="bucket-summary">
            <h3>📅 Additional Incidents by Age</h3>
            <p>The following older incidents also have missing fields. See the full <a href="${spreadsheetUrl}" target="_blank">Missing Field Report here</a> for complete details.</p>
            <p>
                <span class="bucket-count">${availableBuckets['7-30 days'] ? buckets.bucket1.length : 'N/A'}</span> 7-30 days old
                <span class="bucket-count">${availableBuckets['30-90 days'] ? buckets.bucket2.length : 'N/A'}</span> 30-90 days old
                <span class="bucket-count">${availableBuckets['90+ days'] ? buckets.bucket3.length : 'N/A'}</span> 90+ days old
            </p>
        </div>
`;
  }

  // Focus on recent incidents
  if (buckets.emailFocus.length > 0) {
    html += `<h3>📋 Recent Incidents Requiring Immediate Attention (Last ${INCIDENT_FILTERING.dateRanges.emailFocus} Days)</h3>`;
    
    buckets.emailFocus.forEach(incident => {
      const createdDate = new Date(incident.created_at).toLocaleDateString();
      const platformBadge = incident.platform === 'incident.io' ? 'incident.io' : 'FireHydrant';
      const badgeClass = incident.businessUnit.toLowerCase() === 'square' ? 'badge-square' : 
                        incident.businessUnit.toLowerCase() === 'cash' ? 'badge-cash' : 'badge-afterpay';
      
      html += `
        <div class="incident">
            <div class="incident-header">
                <a href="${incident.url}" target="_blank">${incident.reference}</a>
                <span class="platform-badge ${badgeClass}">${platformBadge} - ${incident.businessUnit}</span>
            </div>
            <p><strong>Summary:</strong> ${incident.name || incident.summary || 'No summary available'}</p>
            <p><strong>Created:</strong> ${createdDate}</p>
            <div class="missing-fields">
                <strong>Missing Fields:</strong>
`;
      
      incident.missingFields.forEach(field => {
        html += `<span class="field-tag">${field}</span>`;
      });
      
      html += `
            </div>
        </div>
`;
    });
  } else {
    html += `<h3>✅ No Recent Incidents with Missing Fields</h3>
             <p>Great! No incidents from the last ${INCIDENT_FILTERING.dateRanges.emailFocus} days have missing required fields.</p>`;
  }

  html += `
        <div class="footer">
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li><strong>Immediate Action:</strong> Focus on the recent incidents listed above</li>
                <li><strong>Click incident references</strong> to open them directly and update missing fields</li>
                <li><strong>Complete Report:</strong> Check the Google Sheets report for all incidents and historical tracking</li>
            </ul>
            <hr>
            <p>This automated report focuses on recent incidents for immediate action. The complete tracking data is maintained in Google Sheets for comprehensive analysis.</p>
        </div>
    </div>
</body>
</html>
`;

  return {
    html: html,
    text: generateTieredPlainTextContent(buckets, summary)
  };
}

/**
 * Generate tiered plain text email content
 */
function generateTieredPlainTextContent(buckets, summary) {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  let text = `MISSING FIELDS REPORT\n`;
  text += `Generated on ${currentDate} at ${currentTime}\n\n`;
  
  text += `EXECUTIVE SUMMARY:\n`;
  text += `- Recent Incidents (Last ${INCIDENT_FILTERING.dateRanges.emailFocus} Days): ${buckets.emailFocus.length}\n`;
  text += `- Total Incidents Tracked: ${summary.totalIncidents}\n`;
  
  // Add lookback period information to plain text
  const config = getConfiguration();
  const lookbackPeriodSummary = getLookbackPeriodSummary(config);
  text += `- Data Period: ${lookbackPeriodSummary.summary}\n`;
  
  // Add severity filtering information to plain text
  const severityFilterInfo = getSeverityFilteringSummary(config);
  text += `- Severity Filtering: ${severityFilterInfo.status}\n`;
  if (config.enableSeverityFiltering) {
    text += `- Severity Criteria: ${severityFilterInfo.criteria}\n`;
  }
  text += `\n`;
  
  // Show bucket summary if there are older incidents
  if (buckets.bucket1.length > 0 || buckets.bucket2.length > 0 || buckets.bucket3.length > 0) {
    const spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    
    // Get available age buckets based on lookback period
    const availableBuckets = getAvailableAgeBuckets(config.maxLookbackDays);
    
    text += `ADDITIONAL INCIDENTS BY AGE:\n`;
    text += `- 7-30 days old: ${availableBuckets['7-30 days'] ? buckets.bucket1.length : 'N/A'}\n`;
    text += `- 30-90 days old: ${availableBuckets['30-90 days'] ? buckets.bucket2.length : 'N/A'}\n`;
    text += `- 90+ days old: ${availableBuckets['90+ days'] ? buckets.bucket3.length : 'N/A'}\n`;
    text += `(See the full Missing Field Report here: ${spreadsheetUrl} for complete details)\n\n`;
  }
  
  if (buckets.emailFocus.length > 0) {
    text += `RECENT INCIDENTS REQUIRING IMMEDIATE ATTENTION (Last ${INCIDENT_FILTERING.dateRanges.emailFocus} Days):\n`;
    text += `${'='.repeat(70)}\n\n`;
    
    buckets.emailFocus.forEach((incident, index) => {
      const createdDate = new Date(incident.created_at).toLocaleDateString();
      
      text += `${index + 1}. ${incident.reference} (${incident.platform} - ${incident.businessUnit})\n`;
      text += `   Summary: ${incident.name || incident.summary || 'No summary available'}\n`;
      text += `   Created: ${createdDate}\n`;
      text += `   URL: ${incident.url}\n`;
      text += `   Missing Fields: ${incident.missingFields.join(', ')}\n\n`;
    });
  } else {
    text += `✅ NO RECENT INCIDENTS WITH MISSING FIELDS\n`;
    text += `Great! No incidents from the last ${INCIDENT_FILTERING.dateRanges.emailFocus} days have missing required fields.\n\n`;
  }
  
  text += `NEXT STEPS:\n`;
  text += `- Focus on recent incidents listed above for immediate action\n`;
  text += `- Open incident URLs to update missing fields\n`;
  text += `- Check Google Sheets report for complete tracking\n\n`;
  text += `This automated report focuses on recent incidents. Complete data is in Google Sheets.\n`;
  
  return text;
}

/**
 * Generate plain text email content (fallback)
 */
function generatePlainTextContent(incidentsWithMissingFields, summary, isTest = false) {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  let text = `MISSING FIELDS REPORT${isTest ? ' - TEST' : ''}\n`;
  text += `Generated on ${currentDate} at ${currentTime}\n\n`;
  
  if (isTest) {
    text += `TEST EMAIL - This is a test to verify the Missing Fields Report system is working correctly.\n\n`;
  }
  
  text += `SUMMARY:\n`;
  text += `- Total Incidents with Missing Fields: ${summary.totalIncidents}\n\n`;
  
  text += `Missing Fields Breakdown:\n`;
  Object.entries(summary.fieldCounts).forEach(([field, count]) => {
    if (count > 0) {
      text += `- ${field}: ${count}\n`;
    }
  });
  
  text += `\nBy Platform:\n`;
  Object.entries(summary.platformCounts).forEach(([platform, count]) => {
    text += `- ${platform}: ${count}\n`;
  });
  
  text += `\nBy Brand:\n`;
  Object.entries(summary.businessUnitCounts).forEach(([bu, count]) => {
    text += `- ${bu}: ${count}\n`;
  });
  
  text += `\n\nINCIDENTS REQUIRING ATTENTION:\n`;
  text += `${'='.repeat(50)}\n\n`;
  
  incidentsWithMissingFields.forEach((incident, index) => {
    const createdDate = new Date(incident.created_at).toLocaleDateString();
    
    text += `${index + 1}. ${incident.reference} (${incident.platform} - ${incident.businessUnit})\n`;
    text += `   Summary: ${incident.name || incident.summary || 'No summary available'}\n`;
    text += `   Created: ${createdDate}\n`;
    text += `   URL: ${incident.url}\n`;
    text += `   Missing Fields: ${incident.missingFields.join(', ')}\n\n`;
  });
  
  text += `NEXT STEPS:\n`;
  text += `- Open incident URLs to update missing fields\n`;
  text += `- Incidents will be removed from future reports once completed\n\n`;
  text += `This is an automated report from the Missing Fields Report system.\n`;
  
  return text;
}

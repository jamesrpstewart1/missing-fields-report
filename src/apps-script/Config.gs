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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
    
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
    // Multi-tiered date ranges (all incidents up to 12 months)
    maxLookbackDays: INCIDENT_FILTERING.dateRanges.maxLookback,
    emailFocusDays: INCIDENT_FILTERING.dateRanges.emailFocus,
    
    // Status filtering (platform-specific)
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
 * Update tracking sheet with incidents (includes Date Bucket column)
 */
function updateTrackingSheet(incidentsWithMissingFields) {
  console.log(`📝 Updating tracking sheet with ${incidentsWithMissingFields.length} incidents...`);
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tracking');
    
    if (!sheet) {
      console.log('⚠️ Tracking sheet not found, skipping tracking update');
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    // Prepare data for tracking sheet (with Date Bucket column and Slack links)
    const trackingData = incidentsWithMissingFields.map(incident => {
      const dateBucket = calculateDateBucket(incident.created_at);
      
      // Create hyperlink for reference (clickable incident link)
      const referenceLink = incident.reference && incident.url ? 
        `=HYPERLINK("${incident.url}","${incident.reference}")` : 
        incident.reference || 'N/A';
      
      // Get Slack link or show N/A
      const slackLink = incident.slackUrl ? 
        `=HYPERLINK("${incident.slackUrl}","Open Slack")` : 
        'N/A';
      
      return [
        timestamp,
        referenceLink,  // Now clickable!
        incident.platform,
        incident.businessUnit,
        incident.name || incident.summary || '',
        incident.missingFields.join(', '),
        slackLink,  // Changed from incident URL to Slack link
        new Date(incident.created_at).toLocaleDateString(),
        getIncidentStatus(incident),  // Real incident status instead of 'Active'
        dateBucket  // New Date Bucket column
      ];
    });
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp',
        'Reference',
        'Platform',
        'Business Unit',
        'Summary',
        'Missing Fields',
        'Slack Link',  // Changed from URL to Slack Link
        'Created Date',
        'Status',
        'Date Bucket'  // New Date Bucket column
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center');
    }
    
    // Clear existing data (keep headers) before adding new results
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    
    // Add new tracking data
    if (trackingData.length > 0) {
      sheet.getRange(2, 1, trackingData.length, trackingData[0].length).setValues(trackingData);
    }
    
    console.log(`✅ Tracking sheet updated with ${trackingData.length} entries`);
    
  } catch (error) {
    console.error('❌ Failed to update tracking sheet:', error.toString());
  }
}

/**
 * Calculate date bucket for an incident based on creation date
 */
function calculateDateBucket(createdAt) {
  const now = new Date();
  const createdDate = new Date(createdAt);
  const daysAgo = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  
  if (daysAgo <= 7) {
    return '0-7 days';
  } else if (daysAgo <= 30) {
    return '7-30 days';
  } else if (daysAgo <= 90) {
    return '30-90 days';
  } else {
    return '90+ days';
  }
}

/**
 * Update enhanced summary sheet with comprehensive incident analysis
 */
function updateSummarySheet(incidentsWithMissingFields) {
  console.log(`📊 Updating enhanced summary sheet with comprehensive statistics...`);
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Summary');
    
    if (!sheet) {
      console.log('⚠️ Summary sheet not found, skipping summary update');
      return;
    }
    
    // Clear existing content
    sheet.clear();
    
    // Analyze incidents by multiple dimensions
    const analysis = analyzeIncidents(incidentsWithMissingFields);
    const timestamp = new Date().toLocaleString();
    
    // Calculate totals
    const totalMissing = incidentsWithMissingFields.length;
    const totalIncidents = 5240; // This should come from total API results in the future
    const missingPercentage = ((totalMissing / totalIncidents) * 100).toFixed(1);
    
    // Build the complete enhanced summary layout
    const summaryData = [
      // Row 1: Main Title
      ['MISSING FIELDS REPORT - SUMMARY DASHBOARD', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 3-4: Executive Summary Header
      ['📊 EXECUTIVE SUMMARY', '', '', '', '', `Last Updated: ${timestamp}`, '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 5-8: Executive Summary Data
      [`Total Incidents (365 days): ${totalIncidents.toLocaleString()}`, '', '', `Missing Fields: ${totalMissing.toLocaleString()} (${missingPercentage}%)`, '', '', '', ''],
      [`Critical (90+ days): ${analysis.buckets['90+ days'].length.toLocaleString()}`, '', '', `Urgent (0-7 days): ${analysis.buckets['0-7 days'].length.toLocaleString()}`, '', '', '', ''],
      [`Business Units: Square, Cash, Afterpay`, '', '', `Platforms: incident.io, FireHydrant`, '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 9-10: Business Unit Section Header
      ['🏢 BUSINESS UNIT BREAKDOWN BY DATE BUCKET', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 11: Business Unit Table Headers
      ['Business Unit', '0-7 days', '7-30 days', '30-90 days', '90+ days', 'Total', '% of Total', ''],
      
      // Row 12-15: Business Unit Data
      ...buildBusinessUnitRows(analysis),
      ['', '', '', '', '', '', '', ''],
      
      // Row 17-18: Missing Field Section Header  
      ['📋 MISSING FIELD ANALYSIS BY DATE BUCKET', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 19: Missing Field Table Headers
      ['Missing Field Type', '0-7 days', '7-30 days', '30-90 days', '90+ days', 'Total', '% of Total', ''],
      
      // Row 20-23: Missing Field Data
      ...buildMissingFieldRows(analysis),
      ['', '', '', '', '', '', '', ''],
      
      // Row 25-26: Platform Section Header
      ['📈 PLATFORM BREAKDOWN BY DATE BUCKET', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 27: Platform Table Headers
      ['Platform', '0-7 days', '7-30 days', '30-90 days', '90+ days', 'Total', '% of Total', ''],
      
      // Row 28-30: Platform Data
      ...buildPlatformRows(analysis),
      ['', '', '', '', '', '', '', ''],
      
      // Row 32: Instructions for drilling down (moved to bottom)
      ['💡 HOW TO FILTER INCIDENT DATA', '', '', '', '', '', '', ''],
      ['1. Go to the "Tracking" sheet tab at the bottom', '', '', '', '', '', '', ''],
      ['2. Use the filter buttons in the header row to filter by:', '', '', '', '', '', '', ''],
      ['   • Business Unit (Square, Cash, Afterpay)', '', '', '', '', '', '', ''],
      ['   • Date Bucket (0-7 days, 7-30 days, etc.)', '', '', '', '', '', '', ''],
      ['   • Platform (incident.io, firehydrant)', '', '', '', '', '', '', ''],
      ['3. Click on Reference links to view incidents directly', '', '', '', '', '', '', '']
    ];
    
    // Write all data at once
    sheet.getRange(1, 1, summaryData.length, 8).setValues(summaryData);
    
    // Apply comprehensive formatting
    formatEnhancedSummarySheet(sheet, summaryData.length);
    
    console.log(`✅ Enhanced summary sheet updated with comprehensive statistics`);
    
  } catch (error) {
    console.error('❌ Failed to update enhanced summary sheet:', error.toString());
  }
}

/**
 * Analyze incidents across multiple dimensions
 */
function analyzeIncidents(incidents) {
  const analysis = {
    buckets: {
      '0-7 days': [],
      '7-30 days': [],
      '30-90 days': [],
      '90+ days': []
    },
    businessUnits: {
      'Square': { '0-7 days': [], '7-30 days': [], '30-90 days': [], '90+ days': [] },
      'Cash': { '0-7 days': [], '7-30 days': [], '30-90 days': [], '90+ days': [] },
      'Afterpay': { '0-7 days': [], '7-30 days': [], '30-90 days': [], '90+ days': [] }
    },
    platforms: {
      'incident.io': { '0-7 days': [], '7-30 days': [], '30-90 days': [], '90+ days': [] },
      'firehydrant': { '0-7 days': [], '7-30 days': [], '30-90 days': [], '90+ days': [] }
    },
    missingFields: {
      'Affected Markets': { '0-7 days': 0, '7-30 days': 0, '30-90 days': 0, '90+ days': 0 },
      'Causal Type': { '0-7 days': 0, '7-30 days': 0, '30-90 days': 0, '90+ days': 0 },
      'Stabilization Type': { '0-7 days': 0, '7-30 days': 0, '30-90 days': 0, '90+ days': 0 }
    }
  };
  
  incidents.forEach(incident => {
    const bucket = calculateDateBucket(incident.created_at);
    const businessUnit = incident.businessUnit;
    const platform = incident.platform;
    
    // Categorize by bucket
    analysis.buckets[bucket].push(incident);
    
    // Categorize by business unit and bucket
    if (analysis.businessUnits[businessUnit]) {
      analysis.businessUnits[businessUnit][bucket].push(incident);
    }
    
    // Categorize by platform and bucket
    if (analysis.platforms[platform]) {
      analysis.platforms[platform][bucket].push(incident);
    }
    
    // Count missing field types
    if (incident.missingFields) {
      incident.missingFields.forEach(field => {
        if (analysis.missingFields[field]) {
          analysis.missingFields[field][bucket]++;
        }
      });
    }
  });
  
  return analysis;
}

/**
 * Update business unit breakdown section
 */
function updateBusinessUnitBreakdown(sheet, analysis) {
  const businessUnits = ['Square', 'Cash', 'Afterpay'];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  
  businessUnits.forEach((unit, index) => {
    const row = 12 + index;
    let total = 0;
    
    buckets.forEach((bucket, bucketIndex) => {
      const count = analysis.businessUnits[unit][bucket].length;
      sheet.getRange(row, 2 + bucketIndex).setValue(count);
      total += count;
    });
    
    sheet.getRange(row, 6).setValue(total); // Total column
    const percentage = total > 0 ? ((total / analysis.buckets['0-7 days'].length + analysis.buckets['7-30 days'].length + analysis.buckets['30-90 days'].length + analysis.buckets['90+ days'].length) * 100).toFixed(1) : '0.0';
    sheet.getRange(row, 7).setValue(`${percentage}%`); // Percentage column
  });
}

/**
 * Update missing field analysis section
 */
function updateMissingFieldAnalysis(sheet, analysis) {
  const fieldTypes = ['Affected Markets', 'Causal Type', 'Stabilization Type'];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  
  fieldTypes.forEach((field, index) => {
    const row = 20 + index;
    let total = 0;
    
    buckets.forEach((bucket, bucketIndex) => {
      const count = analysis.missingFields[field][bucket];
      sheet.getRange(row, 2 + bucketIndex).setValue(count);
      total += count;
    });
    
    sheet.getRange(row, 6).setValue(total); // Total column
    const totalMissing = Object.values(analysis.missingFields).reduce((sum, field) => 
      sum + Object.values(field).reduce((fieldSum, count) => fieldSum + count, 0), 0);
    const percentage = totalMissing > 0 ? ((total / totalMissing) * 100).toFixed(1) : '0.0';
    sheet.getRange(row, 7).setValue(`${percentage}%`); // Percentage column
  });
}

/**
 * Update platform breakdown section
 */
function updatePlatformBreakdown(sheet, analysis) {
  const platforms = [
    { name: 'incident.io', key: 'incident.io' },
    { name: 'FireHydrant', key: 'firehydrant' }
  ];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  
  platforms.forEach((platform, index) => {
    const row = 28 + index;
    let total = 0;
    
    buckets.forEach((bucket, bucketIndex) => {
      const count = analysis.platforms[platform.key][bucket].length;
      sheet.getRange(row, 2 + bucketIndex).setValue(count);
      total += count;
    });
    
    sheet.getRange(row, 6).setValue(total); // Total column
    const totalIncidents = Object.values(analysis.buckets).reduce((sum, bucket) => sum + bucket.length, 0);
    const percentage = totalIncidents > 0 ? ((total / totalIncidents) * 100).toFixed(1) : '0.0';
    sheet.getRange(row, 7).setValue(`${percentage}%`); // Percentage column
  });
}

/**
 * Build business unit rows for the summary
 */
function buildBusinessUnitRows(analysis) {
  const businessUnits = ['Square', 'Cash', 'Afterpay'];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  const rows = [];
  
  let grandTotal = 0;
  businessUnits.forEach(unit => {
    buckets.forEach(bucket => {
      grandTotal += analysis.businessUnits[unit][bucket].length;
    });
  });
  
  businessUnits.forEach(unit => {
    const row = [unit];
    let unitTotal = 0;
    
    buckets.forEach(bucket => {
      const count = analysis.businessUnits[unit][bucket].length;
      row.push(count); // Simple number, no hyperlink
      unitTotal += count;
    });
    
    row.push(unitTotal); // Total - simple number, no hyperlink
    
    const percentage = grandTotal > 0 ? ((unitTotal / grandTotal) * 100).toFixed(1) : '0.0';
    row.push(`${percentage}%`); // Percentage
    row.push(''); // Empty column for spacing
    
    rows.push(row);
  });
  
  // Add totals row
  const totalRow = ['TOTAL'];
  buckets.forEach(bucket => {
    const bucketTotal = businessUnits.reduce((sum, unit) => 
      sum + analysis.businessUnits[unit][bucket].length, 0);
    totalRow.push(bucketTotal);
  });
  totalRow.push(grandTotal);
  totalRow.push('100%');
  totalRow.push('');
  rows.push(totalRow);
  
  return rows;
}

/**
 * Build missing field rows for the summary
 */
function buildMissingFieldRows(analysis) {
  const fieldTypes = ['Affected Markets', 'Causal Type', 'Stabilization Type'];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  const rows = [];
  
  let grandTotal = 0;
  fieldTypes.forEach(field => {
    buckets.forEach(bucket => {
      grandTotal += analysis.missingFields[field][bucket];
    });
  });
  
  fieldTypes.forEach(field => {
    const row = [field];
    let fieldTotal = 0;
    
    buckets.forEach(bucket => {
      const count = analysis.missingFields[field][bucket];
      row.push(count);
      fieldTotal += count;
    });
    
    row.push(fieldTotal); // Total
    const percentage = grandTotal > 0 ? ((fieldTotal / grandTotal) * 100).toFixed(1) : '0.0';
    row.push(`${percentage}%`); // Percentage
    row.push(''); // Empty column for spacing
    
    rows.push(row);
  });
  
  // Add totals row
  const totalRow = ['TOTAL'];
  buckets.forEach(bucket => {
    const bucketTotal = fieldTypes.reduce((sum, field) => 
      sum + analysis.missingFields[field][bucket], 0);
    totalRow.push(bucketTotal);
  });
  totalRow.push(grandTotal);
  totalRow.push('100%');
  totalRow.push('');
  rows.push(totalRow);
  
  return rows;
}

/**
 * Build platform rows for the summary
 */
function buildPlatformRows(analysis) {
  const platforms = [
    { name: 'incident.io', key: 'incident.io' },
    { name: 'FireHydrant', key: 'firehydrant' }
  ];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  const rows = [];
  
  let grandTotal = 0;
  platforms.forEach(platform => {
    buckets.forEach(bucket => {
      grandTotal += analysis.platforms[platform.key][bucket].length;
    });
  });
  
  platforms.forEach(platform => {
    const row = [platform.name];
    let platformTotal = 0;
    
    buckets.forEach(bucket => {
      const count = analysis.platforms[platform.key][bucket].length;
      row.push(count);
      platformTotal += count;
    });
    
    row.push(platformTotal); // Total
    const percentage = grandTotal > 0 ? ((platformTotal / grandTotal) * 100).toFixed(1) : '0.0';
    row.push(`${percentage}%`); // Percentage
    row.push(''); // Empty column for spacing
    
    rows.push(row);
  });
  
  // Add totals row
  const totalRow = ['TOTAL'];
  buckets.forEach(bucket => {
    const bucketTotal = platforms.reduce((sum, platform) => 
      sum + analysis.platforms[platform.key][bucket].length, 0);
    totalRow.push(bucketTotal);
  });
  totalRow.push(grandTotal);
  totalRow.push('100%');
  totalRow.push('');
  rows.push(totalRow);
  
  return rows;
}

/**
 * Apply comprehensive formatting to the enhanced summary sheet
 */
function formatEnhancedSummarySheet(sheet, totalRows) {
  // Remove unnecessary columns (I and beyond) and rows (39 and beyond)
  const maxCols = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();
  
  // Delete extra columns (keep only A-H, so delete from column 9 onwards)
  if (maxCols > 8) {
    sheet.deleteColumns(9, maxCols - 8);
  }
  
  // Delete extra rows (keep only up to row 38, so delete from row 39 onwards)
  if (maxRows > 38) {
    sheet.deleteRows(39, maxRows - 38);
  }
  
  // Set column widths
  sheet.setColumnWidth(1, 200); // First column (labels)
  sheet.setColumnWidth(2, 90);  // 0-7 days
  sheet.setColumnWidth(3, 90);  // 7-30 days
  sheet.setColumnWidth(4, 90);  // 30-90 days
  sheet.setColumnWidth(5, 90);  // 90+ days
  sheet.setColumnWidth(6, 90);  // Total
  sheet.setColumnWidth(7, 100); // Percentage
  sheet.setColumnWidth(8, 50);  // Spacing
  
  // Format main title (Row 1)
  const titleRange = sheet.getRange('A1:H1');
  titleRange.merge()
           .setBackground('#1f4e79')
           .setFontColor('#ffffff')
           .setFontWeight('bold')
           .setFontSize(16)
           .setHorizontalAlignment('center')
           .setVerticalAlignment('middle');
  
  // Format executive summary section header (Row 3)
  const execHeaderRange = sheet.getRange('A3:E3');
  execHeaderRange.setBackground('#4285f4')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setFontSize(12);
  
  // Format timestamp (Row 3)
  sheet.getRange('F3:H3').setBackground('#4285f4')
                         .setFontColor('#ffffff')
                         .setFontWeight('bold')
                         .setFontSize(10)
                         .setHorizontalAlignment('right');
  
  // Format executive summary data box (Rows 5-7)
  sheet.getRange('A5:H7').setBackground('#f0f8ff')
                         .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format business unit section header (Row 9)
  sheet.getRange('A9:H9').setBackground('#34a853')
                         .setFontColor('#ffffff')
                         .setFontWeight('bold')
                         .setFontSize(12);
  
  // Format business unit table headers (Row 11)
  sheet.getRange('A11:G11').setBackground('#e8f0fe')
                           .setFontWeight('bold')
                           .setHorizontalAlignment('center')
                           .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format business unit data rows (Rows 12-15)
  sheet.getRange('A12:G15').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format business unit totals row (Row 15)
  sheet.getRange('A15:G15').setBackground('#f8f9fa')
                           .setFontWeight('bold');
  
  // Format missing field section header (Row 17)
  sheet.getRange('A17:H17').setBackground('#ff9800')
                           .setFontColor('#ffffff')
                           .setFontWeight('bold')
                           .setFontSize(12);
  
  // Format missing field table headers (Row 19)
  sheet.getRange('A19:G19').setBackground('#e8f0fe')
                           .setFontWeight('bold')
                           .setHorizontalAlignment('center')
                           .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format missing field data rows (Rows 20-23)
  sheet.getRange('A20:G23').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format missing field totals row (Row 23)
  sheet.getRange('A23:G23').setBackground('#f8f9fa')
                           .setFontWeight('bold');
  
  // Format platform section header (Row 25)
  sheet.getRange('A25:H25').setBackground('#9c27b0')
                           .setFontColor('#ffffff')
                           .setFontWeight('bold')
                           .setFontSize(12);
  
  // Format platform table headers (Row 27)
  sheet.getRange('A27:G27').setBackground('#e8f0fe')
                           .setFontWeight('bold')
                           .setHorizontalAlignment('center')
                           .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format platform data rows (Rows 28-30)
  sheet.getRange('A28:G30').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format platform totals row (Row 30)
  sheet.getRange('A30:G30').setBackground('#f8f9fa')
                           .setFontWeight('bold');
  
  // Format instructions section header (Row 32) - moved to bottom
  sheet.getRange('A32:H32').setBackground('#ffc107')
                           .setFontColor('#000000')
                           .setFontWeight('bold')
                           .setFontSize(12);
  
  // Format instructions text (Rows 33-38) - moved to bottom
  sheet.getRange('A33:H38').setBackground('#fffbf0')
                           .setFontStyle('italic');
  
  // Center align all numeric data
  sheet.getRange('B11:G30').setHorizontalAlignment('center');
  
  // Remove gridlines from the entire sheet
  sheet.setHiddenGridlines(true);
  
  // Add a border around the entire content area
  sheet.getRange('A1:H38').setBorder(true, true, true, true, false, false, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Add conditional formatting for high numbers (updated row ranges)
  const criticalRange = sheet.getRange('E12:E30'); // 90+ days column (updated ranges)
  const criticalRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(100)
    .setBackground('#ffebee')
    .setRanges([criticalRange])
    .build();
  
  const urgentRange = sheet.getRange('B12:B30'); // 0-7 days column (updated ranges)
  const urgentRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(10)
    .setBackground('#fff3e0')
    .setRanges([urgentRange])
    .build();
  
  const rules = sheet.getConditionalFormatRules();
  rules.push(criticalRule, urgentRule);
  sheet.setConditionalFormatRules(rules);
}

/**
 * Log execution details
 */
function logExecution(totalIncidents, incidentsWithMissingFields) {
  console.log(`📊 Logging execution details...`);
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logs');
    
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
 * Get real incident status from platform-specific data
 */
function getIncidentStatus(incident) {
  if (incident.platform === 'incident.io') {
    // incident.io uses incident_status.name
    return incident.incident_status?.name || 'Unknown';
  } else if (incident.platform === 'firehydrant') {
    // FireHydrant uses current_milestone
    return incident.current_milestone || 'Unknown';
  }
  
  return 'Unknown';
}

/**
 * Create a navigation URL to the Tracking sheet with instructions
 */
function createTrackingNavigationUrl(filterValue, dateBucket, filterType) {
  // Get the current spreadsheet ID
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  
  // Get the Tracking sheet ID
  const trackingSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tracking');
  if (!trackingSheet) {
    return '#'; // Fallback if no tracking sheet
  }
  const sheetId = trackingSheet.getSheetId();
  
  // Create a simple navigation URL to the Tracking sheet
  // We'll add a note in the cell to explain what to filter for
  const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  return baseUrl;
}

/**
 * Create drill-down sheets for each business unit and date bucket combination
 */
function createDrillDownSheets(incidentsWithMissingFields) {
  console.log('📋 Creating drill-down sheets for detailed analysis...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const analysis = analyzeIncidents(incidentsWithMissingFields);
    
    // Create drill-down sheets for business units
    const businessUnits = ['Square', 'Cash', 'Afterpay'];
    const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
    
    businessUnits.forEach(unit => {
      buckets.forEach(bucket => {
        const incidents = analysis.businessUnits[unit][bucket];
        if (incidents.length > 0) {
          const sheetName = `${unit} ${bucket}`;
          createOrUpdateDrillDownSheet(sheetName, incidents, unit, bucket);
        }
      });
    });
    
    console.log('✅ Drill-down sheets created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create drill-down sheets:', error.toString());
  }
}

/**
 * Create or update a drill-down sheet for specific incidents
 */
function createOrUpdateDrillDownSheet(sheetName, incidents, businessUnit, dateBucket) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if sheet already exists, if so delete it
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) {
      spreadsheet.deleteSheet(sheet);
    }
    
    // Create new sheet
    sheet = spreadsheet.insertSheet(sheetName);
    
    // Add title and summary
    const title = `${businessUnit} Incidents - ${dateBucket}`;
    sheet.getRange('A1').setValue(title);
    sheet.getRange('A2').setValue(`Total Incidents: ${incidents.length}`);
    sheet.getRange('A3').setValue(`Last Updated: ${new Date().toLocaleString()}`);
    
    // Add headers
    const headers = [
      'Reference',
      'Platform', 
      'Business Unit',
      'Summary',
      'Missing Fields',
      'Slack Link',
      'Created Date',
      'Status',
      'Date Bucket'
    ];
    
    sheet.getRange(5, 1, 1, headers.length).setValues([headers]);
    
    // Add incident data
    const incidentData = incidents.map(incident => [
      incident.reference || 'N/A',
      incident.platform,
      incident.businessUnit,
      incident.name || incident.summary || '',
      incident.missingFields ? incident.missingFields.join(', ') : '',
      incident.slackUrl ? `=HYPERLINK("${incident.slackUrl}","Open Slack")` : 'N/A',
      new Date(incident.created_at).toLocaleDateString(),
      getIncidentStatus(incident),
      calculateDateBucket(incident.created_at)
    ]);
    
    if (incidentData.length > 0) {
      sheet.getRange(6, 1, incidentData.length, headers.length).setValues(incidentData);
    }
    
    // Format the sheet
    formatDrillDownSheet(sheet, headers.length, incidentData.length);
    
  } catch (error) {
    console.error(`❌ Failed to create drill-down sheet ${sheetName}:`, error.toString());
  }
}

/**
 * Format drill-down sheet
 */
function formatDrillDownSheet(sheet, headerCount, dataRowCount) {
  // Format title
  sheet.getRange('A1').setBackground('#1f4e79')
                      .setFontColor('#ffffff')
                      .setFontWeight('bold')
                      .setFontSize(14);
  
  // Format summary info
  sheet.getRange('A2:A3').setBackground('#f0f8ff')
                         .setFontWeight('bold');
  
  // Format headers
  sheet.getRange(5, 1, 1, headerCount).setBackground('#4285f4')
                                      .setFontColor('#ffffff')
                                      .setFontWeight('bold')
                                      .setHorizontalAlignment('center');
  
  // Format data rows
  if (dataRowCount > 0) {
    sheet.getRange(6, 1, dataRowCount, headerCount).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  }
  
  // Set column widths
  sheet.setColumnWidth(1, 120); // Reference
  sheet.setColumnWidth(2, 100); // Platform
  sheet.setColumnWidth(3, 120); // Business Unit
  sheet.setColumnWidth(4, 300); // Summary
  sheet.setColumnWidth(5, 200); // Missing Fields
  sheet.setColumnWidth(6, 120); // Slack Link
  sheet.setColumnWidth(7, 120); // Created Date
  sheet.setColumnWidth(8, 120); // Status
  sheet.setColumnWidth(9, 120); // Date Bucket
}

/**
 * Create navigation links to drill-down sheets
 */
function createDrillDownLink(businessUnit, dateBucket) {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const sheetName = `${businessUnit} ${dateBucket}`;
  
  // Find the sheet by name to get its ID
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (sheet) {
    const sheetId = sheet.getSheetId();
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  }
  
  // Fallback to tracking sheet
  const trackingSheet = spreadsheet.getSheetByName('Tracking');
  if (trackingSheet) {
    const trackingSheetId = trackingSheet.getSheetId();
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${trackingSheetId}`;
  }
  
  return '#';
}

/**
 * Create README sheet with comprehensive documentation
 */
function createReadmeSheet() {
  console.log('📚 Creating README sheet...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if README sheet already exists
    let readmeSheet = spreadsheet.getSheetByName('README');
    if (readmeSheet) {
      // Clear existing content
      readmeSheet.clear();
    } else {
      // Create new README sheet
      readmeSheet = spreadsheet.insertSheet('README');
      // Move to first position
      spreadsheet.moveActiveSheet(1);
    }
    
    // Prepare README content
    const readmeContent = [
      // Title and Overview
      ['📚 MISSING FIELDS REPORT - SYSTEM DOCUMENTATION', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['🎯 SYSTEM OVERVIEW', '', '', '', '', '', ''],
      ['This automated system monitors incidents across incident.io and FireHydrant platforms', '', '', '', '', '', ''],
      ['to identify missing required fields and send daily email notifications.', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // How It Works
      ['⚙️ HOW IT WORKS', '', '', '', '', '', ''],
      ['1. Daily at 9:00 AM, the system automatically fetches incidents from all platforms', '', '', '', '', '', ''],
      ['2. Filters incidents based on specific criteria (status, type, mode)', '', '', '', '', '', ''],
      ['3. Validates required fields for each business unit', '', '', '', '', '', ''],
      ['4. Sends email notifications for incidents with missing fields', '', '', '', '', '', ''],
      ['5. Updates tracking sheets with current data', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Business Unit & Platform Mapping
      ['🏢 BUSINESS UNIT & PLATFORM MAPPING', '', '', '', '', '', ''],
      ['Business Unit', 'Platform', 'API Source', 'Required Fields', '', '', ''],
      ['Square', 'incident.io', 'api.incident.io/v2', 'Affected Markets, Causal Type, Stabilization Type', '', '', ''],
      ['Cash', 'incident.io', 'api.incident.io/v2', 'Affected Markets, Causal Type, Stabilization Type', '', '', ''],
      ['Afterpay', 'FireHydrant', 'api.firehydrant.io/v1', 'Market', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Filtering Criteria
      ['🔍 FILTERING CRITERIA', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['INCIDENT.IO FILTERING (Square & Cash):', '', '', '', '', '', ''],
      ['✅ INCLUDED Statuses:', 'Stabilized, Postmortem Prep, Postmortem Meeting Prep, Closed', '', '', '', '', ''],
      ['✅ INCLUDED Modes:', 'standard, retrospective', '', '', '', '', ''],
      ['❌ EXCLUDED Types:', '[TEST], [Preemptive SEV]', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['FIREHYDRANT FILTERING (Afterpay):', '', '', '', '', '', ''],
      ['✅ INCLUDED Statuses:', 'Stabilized, Remediation, Resolved, Retrospective Started,', '', '', '', '', ''],
      ['', 'Retrospective Completed, Closed', '', '', '', '', ''],
      ['✅ INCLUDED Modes:', 'standard, retrospective', '', '', '', '', ''],
      ['❌ EXCLUDED Types:', '[TEST], [Preemptive SEV]', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Date Buckets
      ['📅 DATE BUCKET SYSTEM', '', '', '', '', '', ''],
      ['The system categorizes incidents into age-based buckets for reporting:', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Bucket', 'Age Range', 'Email Treatment', 'Purpose', '', '', ''],
      ['0-7 days', 'Last 7 days', 'Full details shown', 'Immediate action required', '', '', ''],
      ['7-30 days', '7-30 days old', 'Count summary only', 'Recent but not urgent', '', '', ''],
      ['30-90 days', '30-90 days old', 'Count summary only', 'Older incidents', '', '', ''],
      ['90+ days', '90+ days old', 'Count summary only', 'Historical tracking', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Sheet Descriptions
      ['📊 SHEET DESCRIPTIONS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['SUMMARY SHEET:', '', '', '', '', '', ''],
      ['• Executive dashboard with key metrics and breakdowns', '', '', '', '', '', ''],
      ['• Business unit analysis by date buckets', '', '', '', '', '', ''],
      ['• Missing field analysis by type and age', '', '', '', '', '', ''],
      ['• Platform breakdown and totals', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['TRACKING SHEET:', '', '', '', '', '', ''],
      ['• Detailed list of all incidents with missing fields', '', '', '', '', '', ''],
      ['• Clickable incident references and Slack links', '', '', '', '', '', ''],
      ['• Filterable by business unit, platform, and date bucket', '', '', '', '', '', ''],
      ['• Updated daily with current data', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['CONFIG SHEET:', '', '', '', '', '', ''],
      ['• System configuration parameters', '', '', '', '', '', ''],
      ['• Email recipients and notification settings', '', '', '', '', '', ''],
      ['• API keys and endpoint configurations', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['LOGS SHEET:', '', '', '', '', '', ''],
      ['• Execution history and system performance', '', '', '', '', '', ''],
      ['• Error tracking and debugging information', '', '', '', '', '', ''],
      ['• Daily run statistics and timestamps', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Email Notifications
      ['📧 EMAIL NOTIFICATIONS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['WHEN EMAILS ARE SENT:', '', '', '', '', '', ''],
      ['• Daily at 9:00 AM (automated)', '', '', '', '', '', ''],
      ['• Only when incidents with missing fields are found', '', '', '', '', '', ''],
      ['• Manual runs via "Check Missing Fields Now" menu', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['EMAIL CONTENT:', '', '', '', '', '', ''],
      ['• Summary of recent incidents (last 7 days) with full details', '', '', '', '', '', ''],
      ['• Count summary of older incidents by age bucket', '', '', '', '', '', ''],
      ['• Color-coded business unit badges (Black=Square, Green=Cash, Blue=Afterpay)', '', '', '', '', '', ''],
      ['• Direct links to incidents and Google Sheets report', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Manual Actions
      ['🔧 MANUAL ACTIONS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['AVAILABLE MENU OPTIONS:', '', '', '', '', '', ''],
      ['🔄 Check Missing Fields Now', 'Run immediate check and update all sheets', '', '', '', '', ''],
      ['📧 Send Test Email', 'Send test notification to verify email delivery', '', '', '', '', ''],
      ['🔧 Setup Daily Automation', 'Configure daily 9 AM automated checks', '', '', '', '', ''],
      ['🛑 Cancel Daily Automation', 'Disable automated daily checks', '', '', '', '', ''],
      ['📊 Show Automation Status', 'View current automation trigger status', '', '', '', '', ''],
      ['🔗 Test API Connections', 'Verify connectivity to all platforms', '', '', '', '', ''],
      ['ℹ️ About This Report', 'Show basic system information', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Troubleshooting
      ['🛠️ TROUBLESHOOTING', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['COMMON ISSUES:', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Issue: No data in sheets', '', '', '', '', '', ''],
      ['Solution: Check API connections, verify API keys in Config sheet', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Issue: Emails not being sent', '', '', '', '', '', ''],
      ['Solution: Verify email recipients in Config sheet, check automation status', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Issue: Wrong incidents being tracked', '', '', '', '', '', ''],
      ['Solution: Review filtering criteria above, check incident status/type/mode', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Issue: Automation not running', '', '', '', '', '', ''],
      ['Solution: Use "Show Automation Status" to check triggers, re-setup if needed', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Field Mapping Details
      ['🗺️ FIELD MAPPING DETAILS', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['INCIDENT.IO FIELD MAPPING:', '', '', '', '', '', ''],
      ['Required Field', 'Possible API Field Names', '', '', '', '', ''],
      ['Affected Markets', 'Affected Markets, Affected Market(s), Markets Affected, Impacted Markets', '', '', '', '', ''],
      ['Causal Type', 'Causal Type, CAUSAL TYPE', '', '', '', '', ''],
      ['Stabilization Type', 'Stabilisation Type, Stabilization Type, STABILISATION TYPE, STABILIZATION TYPE', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['FIREHYDRANT FIELD MAPPING:', '', '', '', '', '', ''],
      ['Required Field', 'Possible API Field Names', '', '', '', '', ''],
      ['Market', 'market, Market, markets, Markets', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Contact Information
      ['📞 SUPPORT & CONTACT', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['For technical issues or questions:', '', '', '', '', '', ''],
      ['• Check the Logs sheet for error details', '', '', '', '', '', ''],
      ['• Use "Test API Connections" to verify platform connectivity', '', '', '', '', '', ''],
      ['• Review this README for configuration guidance', '', '', '', '', '', ''],
      ['• Contact the platform team for API key or access issues', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      
      // Version Information
      ['📋 SYSTEM INFORMATION', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Version:', 'v2.0', '', '', '', '', ''],
      ['Last Updated:', new Date().toLocaleDateString(), '', '', '', '', ''],
      ['Platforms:', 'incident.io (Square, Cash), FireHydrant (Afterpay)', '', '', '', '', ''],
      ['Data Retention:', '365 days (12 months)', '', '', '', '', ''],
      ['Email Focus:', 'Last 7 days (detailed), older incidents summarized', '', '', '', '', ''],
      ['Update Frequency:', 'Daily at 9:00 AM', '', '', '', '', '']
    ];
    
    // Write content to sheet
    if (readmeContent.length > 0) {
      readmeSheet.getRange(1, 1, readmeContent.length, 7).setValues(readmeContent);
    }
    
    // Apply formatting
    formatReadmeSheet(readmeSheet);
    
    console.log('✅ README sheet created successfully');
    
    // Show success message
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '📚 README Sheet Created',
      'A comprehensive README sheet has been added to your spreadsheet with:\n\n' +
      '• System overview and how it works\n' +
      '• Business unit and platform mapping\n' +
      '• Detailed filtering criteria\n' +
      '• Date bucket explanations\n' +
      '• Sheet descriptions\n' +
      '• Email notification details\n' +
      '• Manual actions guide\n' +
      '• Troubleshooting tips\n' +
      '• Field mapping details\n\n' +
      'Check the README tab for complete documentation!',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Failed to create README sheet:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ README Creation Failed',
      `Failed to create README sheet:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Format the README sheet for better readability
 */
function formatReadmeSheet(sheet) {
  // Set column widths
  sheet.setColumnWidth(1, 300); // Main content
  sheet.setColumnWidth(2, 200); // Secondary content
  sheet.setColumnWidth(3, 150); // Tertiary content
  sheet.setColumnWidth(4, 200); // Additional content
  sheet.setColumnWidth(5, 100); // Spacing
  sheet.setColumnWidth(6, 100); // Spacing
  sheet.setColumnWidth(7, 100); // Spacing
  
  // Format title (Row 1)
  const titleRange = sheet.getRange('A1:G1');
  titleRange.merge()
           .setBackground('#1f4e79')
           .setFontColor('#ffffff')
           .setFontWeight('bold')
           .setFontSize(16)
           .setHorizontalAlignment('center')
           .setVerticalAlignment('middle');
  
  // Format section headers (rows with emoji headers)
  const sectionHeaders = [3, 7, 14, 20, 33, 47, 56, 68, 78, 95, 104, 113]; // Approximate row numbers for section headers
  
  sectionHeaders.forEach(row => {
    try {
      const headerRange = sheet.getRange(row, 1, 1, 7);
      headerRange.setBackground('#4285f4')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setFontSize(12);
    } catch (error) {
      // Skip if row doesn't exist
    }
  });
  
  // Format table headers
  const tableHeaderRows = [15, 25, 35, 58, 79, 96]; // Approximate rows with table headers
  
  tableHeaderRows.forEach(row => {
    try {
      const headerRange = sheet.getRange(row, 1, 1, 4);
      headerRange.setBackground('#e8f0fe')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center');
    } catch (error) {
      // Skip if row doesn't exist
    }
  });
  
  // Remove gridlines
  sheet.setHiddenGridlines(true);
  
  // Add border around content
  const lastRow = sheet.getLastRow();
  if (lastRow > 0) {
    sheet.getRange(1, 1, lastRow, 7).setBorder(true, true, true, true, false, false, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  }
  
  // Freeze first row
  sheet.setFrozenRows(1);
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
    'Use "Check Missing Fields Now" for manual checks or "Setup Daily Automation" for automated daily reports.\n\n' +
    'For complete documentation, check the README sheet!',
    ui.ButtonSet.OK
  );
}

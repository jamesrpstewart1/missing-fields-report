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
    excludeTypes: INCIDENT_FILTERING.excludeTypes,
    
    // Severity filtering (new)
    enableSeverityFiltering: false,
    incidentioSeverities: ['SEV0', 'SEV1', 'SEV2', 'SEV3', 'SEV4'],
    includeInternalImpact: true,
    firehydrantSeverities: ['SEV0', 'SEV1', 'SEV2', 'SEV3', 'SEV4']
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
    
    // Prepare data for tracking sheet (with Date Bucket column, Slack links, and Severity)
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
      
      // Get severity information
      const severity = getIncidentSeverity(incident);
      
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
        severity,  // New Severity column
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
        'Severity',  // New Severity column
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
function updateSummarySheet(incidentsWithMissingFields, totalIncidentsProcessed = null) {
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
    
    // Calculate totals - use the passed total or calculate from analysis
    const totalMissing = incidentsWithMissingFields.length;
    const config = getConfiguration();
    const lookbackDays = config.maxLookbackDays || 365;  // ✅ FIXED! Changed from 30 to 365 days
    
    // Use passed totalIncidentsProcessed if available, otherwise calculate from analysis
    const totalIncidents = totalIncidentsProcessed !== null ? totalIncidentsProcessed : 
      Object.values(analysis.buckets).reduce((sum, bucket) => sum + bucket.length, 0);
    
    const missingPercentage = totalIncidents > 0 ? ((totalMissing / totalIncidents) * 100).toFixed(1) : '0.0';
    
    // Get severity filtering info
    const severityFilteringEnabled = config.enableSeverityFiltering || false;
    const severityFilterInfo = getSeverityFilteringSummary(config);
    
    // Get lookback period info
    const lookbackPeriodInfo = getLookbackPeriodSummary(config);
    const availableBuckets = lookbackPeriodInfo.availableBuckets;
    
    // Build the complete enhanced summary layout
    const summaryData = [
      // Row 1: Main Title
      ['MISSING FIELDS REPORT - SUMMARY DASHBOARD', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 3-4: Executive Summary Header
      ['📊 EXECUTIVE SUMMARY', '', '', '', '', `Last Updated: ${timestamp}`, '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 5-10: Executive Summary Data (expanded for lookback period and severity filtering)
      [`Total Incidents: ${totalIncidents.toLocaleString()}`, '', '', `Missing Fields: ${totalMissing.toLocaleString()} (${missingPercentage}%)`, '', '', '', ''],
      [lookbackPeriodInfo.summary, '', '', '', '', '', '', ''],
      [`Critical (90+ days): ${availableBuckets['90+ days'] ? analysis.buckets['90+ days'].length.toLocaleString() : 'N/A'}`, '', '', `Urgent (0-7 days): ${availableBuckets['0-7 days'] ? analysis.buckets['0-7 days'].length.toLocaleString() : 'N/A'}`, '', '', '', ''],
      [`Business Units: Square, Cash, Afterpay`, '', '', `Platforms: incident.io, FireHydrant`, '', '', '', ''],
      [severityFilterInfo.status, '', '', severityFilterInfo.criteria, '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 9-10: Business Unit Section Header
      ['🏢 BUSINESS UNIT BREAKDOWN BY DATE BUCKET', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 11: Business Unit Table Headers
      ['Business Unit', '0-7 days', '7-30 days', '30-90 days', '90+ days', 'Total', '% of Total', ''],
      
      // Row 12-15: Business Unit Data
      ...buildBusinessUnitRows(analysis, config),
      ['', '', '', '', '', '', '', ''],
      
      // Row 17-18: Missing Field Section Header  
      ['📋 MISSING FIELD ANALYSIS BY DATE BUCKET', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 19: Missing Field Table Headers
      ['Missing Field Type', '0-7 days', '7-30 days', '30-90 days', '90+ days', 'Total', '% of Total', ''],
      
      // Row 20-23: Missing Field Data
      ...buildMissingFieldRows(analysis, config),
      ['', '', '', '', '', '', '', ''],
      
      // Row 25-26: Platform Section Header
      ['📈 PLATFORM BREAKDOWN BY DATE BUCKET', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      
      // Row 27: Platform Table Headers
      ['Platform', '0-7 days', '7-30 days', '30-90 days', '90+ days', 'Total', '% of Total', ''],
      
      // Row 28-30: Platform Data
      ...buildPlatformRows(analysis, config),
      ['', '', '', '', '', '', '', ''],
      
      // Instructions for drilling down (moved to bottom)
      ['💡 HOW TO FILTER INCIDENT DATA', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['1. Go to the "Tracking" sheet tab at the bottom', '', '', '', '', '', '', ''],
      ['2. Use the filter buttons in the header row to filter by:', '', '', '', '', '', '', ''],
      ['   • Business Unit (Square, Cash, Afterpay)', '', '', '', '', '', '', ''],
      ['   • Date Bucket (0-7 days, 7-30 days, etc.)', '', '', '', '', '', '', ''],
      ['   • Platform (incident.io, firehydrant)', '', '', '', '', '', '', ''],
      ['   • Missing Fields', '', '', '', '', '', '', ''],
      ['   • Severity', '', '', '', '', '', '', ''],
      ['3. Click on Reference links to view incidents directly', '', '', '', '', '', '', ''],
      ['4. Use Slack links to join incident channels', '', '', '', '', '', '', '']
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
      'Stabilization Type': { '0-7 days': 0, '7-30 days': 0, '30-90 days': 0, '90+ days': 0 },
      'Impact Start Date': { '0-7 days': 0, '7-30 days': 0, '30-90 days': 0, '90+ days': 0 },
      'Transcript URL': { '0-7 days': 0, '7-30 days': 0, '30-90 days': 0, '90+ days': 0 }
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
 * Build business unit rows for the summary with smart N/A handling
 */
function buildBusinessUnitRows(analysis, config) {
  const businessUnits = ['Square', 'Cash', 'Afterpay'];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  const availableBuckets = getAvailableAgeBuckets(config.maxLookbackDays || 365);
  const rows = [];
  
  let grandTotal = 0;
  businessUnits.forEach(unit => {
    buckets.forEach(bucket => {
      if (availableBuckets[bucket]) {
        grandTotal += analysis.businessUnits[unit][bucket].length;
      }
    });
  });
  
  businessUnits.forEach(unit => {
    const row = [unit];
    let unitTotal = 0;
    
    buckets.forEach(bucket => {
      if (availableBuckets[bucket]) {
        const count = analysis.businessUnits[unit][bucket].length;
        row.push(count);
        unitTotal += count;
      } else {
        row.push('N/A');
      }
    });
    
    row.push(unitTotal); // Total - only count available buckets
    
    const percentage = grandTotal > 0 ? ((unitTotal / grandTotal) * 100).toFixed(1) : '0.0';
    row.push(`${percentage}%`); // Percentage
    row.push(''); // Empty column for spacing
    
    rows.push(row);
  });
  
  // Add totals row
  const totalRow = ['TOTAL'];
  buckets.forEach(bucket => {
    if (availableBuckets[bucket]) {
      const bucketTotal = businessUnits.reduce((sum, unit) => 
        sum + analysis.businessUnits[unit][bucket].length, 0);
      totalRow.push(bucketTotal);
    } else {
      totalRow.push('N/A');
    }
  });
  totalRow.push(grandTotal);
  totalRow.push('100%');
  totalRow.push('');
  rows.push(totalRow);
  
  return rows;
}

/**
 * Build missing field rows for the summary with smart N/A handling
 */
function buildMissingFieldRows(analysis, config) {
  const fieldTypes = ['Affected Markets', 'Causal Type', 'Stabilization Type', 'Impact Start Date', 'Transcript URL'];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  const availableBuckets = getAvailableAgeBuckets(config.maxLookbackDays || 365);
  const rows = [];
  
  let grandTotal = 0;
  fieldTypes.forEach(field => {
    buckets.forEach(bucket => {
      if (availableBuckets[bucket]) {
        grandTotal += (analysis.missingFields[field] ? analysis.missingFields[field][bucket] : 0);
      }
    });
  });
  
  fieldTypes.forEach(field => {
    const row = [field];
    let fieldTotal = 0;
    
    buckets.forEach(bucket => {
      if (availableBuckets[bucket]) {
        const count = analysis.missingFields[field] ? analysis.missingFields[field][bucket] : 0;
        row.push(count);
        fieldTotal += count;
      } else {
        row.push('N/A');
      }
    });
    
    row.push(fieldTotal); // Total - only count available buckets
    const percentage = grandTotal > 0 ? ((fieldTotal / grandTotal) * 100).toFixed(1) : '0.0';
    row.push(`${percentage}%`); // Percentage
    row.push(''); // Empty column for spacing
    
    rows.push(row);
  });
  
  // Add totals row
  const totalRow = ['TOTAL'];
  buckets.forEach(bucket => {
    if (availableBuckets[bucket]) {
      const bucketTotal = fieldTypes.reduce((sum, field) => 
        sum + (analysis.missingFields[field] ? analysis.missingFields[field][bucket] : 0), 0);
      totalRow.push(bucketTotal);
    } else {
      totalRow.push('N/A');
    }
  });
  totalRow.push(grandTotal);
  totalRow.push('100%');
  totalRow.push('');
  rows.push(totalRow);
  
  return rows;
}

/**
 * Build platform rows for the summary with smart N/A handling
 */
function buildPlatformRows(analysis, config) {
  const platforms = [
    { name: 'incident.io', key: 'incident.io' },
    { name: 'FireHydrant', key: 'firehydrant' }
  ];
  const buckets = ['0-7 days', '7-30 days', '30-90 days', '90+ days'];
  const availableBuckets = getAvailableAgeBuckets(config.maxLookbackDays || 365);
  const rows = [];
  
  let grandTotal = 0;
  platforms.forEach(platform => {
    buckets.forEach(bucket => {
      if (availableBuckets[bucket]) {
        grandTotal += analysis.platforms[platform.key][bucket].length;
      }
    });
  });
  
  platforms.forEach(platform => {
    const row = [platform.name];
    let platformTotal = 0;
    
    buckets.forEach(bucket => {
      if (availableBuckets[bucket]) {
        const count = analysis.platforms[platform.key][bucket].length;
        row.push(count);
        platformTotal += count;
      } else {
        row.push('N/A');
      }
    });
    
    row.push(platformTotal); // Total - only count available buckets
    const percentage = grandTotal > 0 ? ((platformTotal / grandTotal) * 100).toFixed(1) : '0.0';
    row.push(`${percentage}%`); // Percentage
    row.push(''); // Empty column for spacing
    
    rows.push(row);
  });
  
  // Add totals row
  const totalRow = ['TOTAL'];
  buckets.forEach(bucket => {
    if (availableBuckets[bucket]) {
      const bucketTotal = platforms.reduce((sum, platform) => 
        sum + analysis.platforms[platform.key][bucket].length, 0);
      totalRow.push(bucketTotal);
    } else {
      totalRow.push('N/A');
    }
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
  // Calculate the actual number of rows needed based on totalRows
  const actualRows = Math.max(totalRows + 5, 50); // Increased buffer to accommodate all content
  
  // Remove unnecessary columns (I and beyond) and excess rows
  const maxCols = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();
  
  // Delete extra columns (keep only A-H, so delete from column 9 onwards)
  if (maxCols > 8) {
    sheet.deleteColumns(9, maxCols - 8);
  }
  
  // Delete extra rows (keep only up to actualRows, so delete from actualRows+1 onwards)
  if (maxRows > actualRows) {
    sheet.deleteRows(actualRows + 1, maxRows - actualRows);
  }
  
  // Set column widths - make first column much wider to fit severity filtering text
  sheet.setColumnWidth(1, 350); // First column (labels) - much wider for severity filtering info
  sheet.setColumnWidth(2, 85);  // 0-7 days
  sheet.setColumnWidth(3, 85);  // 7-30 days
  sheet.setColumnWidth(4, 85);  // 30-90 days
  sheet.setColumnWidth(5, 85);  // 90+ days
  sheet.setColumnWidth(6, 85);  // Total
  sheet.setColumnWidth(7, 95);  // Percentage
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
  
  // Format executive summary data box (Rows 5-9) - expanded to accommodate new info
  sheet.getRange('A5:H9').setBackground('#f0f8ff')
                         .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format business unit section header (Row 11) - updated row number
  sheet.getRange('A11:H11').setBackground('#34a853')
                           .setFontColor('#ffffff')
                           .setFontWeight('bold')
                           .setFontSize(12);
  
  // Format business unit table headers (Row 13) - updated row number
  sheet.getRange('A13:G13').setBackground('#e8f0fe')
                           .setFontWeight('bold')
                           .setHorizontalAlignment('center')
                           .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format business unit data rows (Rows 14-17) - updated row numbers
  sheet.getRange('A14:G17').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format business unit totals row (Row 17) - updated row number
  sheet.getRange('A17:G17').setBackground('#f8f9fa')
                           .setFontWeight('bold');
  
  // Format missing field section header (Row 19) - updated row number
  sheet.getRange('A19:H19').setBackground('#ff9800')
                           .setFontColor('#ffffff')
                           .setFontWeight('bold')
                           .setFontSize(12);
  
  // Format missing field table headers (Row 21) - updated row number
  sheet.getRange('A21:G21').setBackground('#e8f0fe')
                           .setFontWeight('bold')
                           .setHorizontalAlignment('center')
                           .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format missing field data rows (Rows 22-27) - updated to include new fields
  sheet.getRange('A22:G27').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format missing field totals row (Row 27) - updated row number
  sheet.getRange('A27:G27').setBackground('#f8f9fa')
                           .setFontWeight('bold')
                           .setFontColor('#000000'); // Ensure text is black and readable
  
  // Format platform section header (Row 29) - updated row number
  sheet.getRange('A29:H29').setBackground('#9c27b0')
                           .setFontColor('#ffffff')
                           .setFontWeight('bold')
                           .setFontSize(12);
  
  // Format platform table headers (Row 31) - updated row number
  sheet.getRange('A31:G31').setBackground('#e8f0fe')
                           .setFontWeight('bold')
                           .setHorizontalAlignment('center')
                           .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format platform data rows (Rows 32-34) - updated row numbers
  sheet.getRange('A32:G34').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  
  // Format platform totals row (Row 34) - updated row number
  sheet.getRange('A34:G34').setBackground('#f8f9fa')
                           .setFontWeight('bold');
  
  // Format instructions section header (Row 36) - updated row number
  sheet.getRange('A36:H36').setBackground('#ffc107')
                           .setFontColor('#000000')
                           .setFontWeight('bold')
                           .setFontSize(12);
  
  // Format ALL instructions text rows (Rows 38 to end of instructions) - fix background color consistency
  const instructionStartRow = 38;
  const instructionEndRow = totalRows; // Use actual total rows to cover all instruction rows
  sheet.getRange(`A${instructionStartRow}:H${instructionEndRow}`).setBackground('#fffbf0')
                                                                 .setFontStyle('italic');
  
  // Center align all numeric data - updated row ranges
  sheet.getRange('B13:G34').setHorizontalAlignment('center');
  
  // Remove gridlines from the entire sheet
  sheet.setHiddenGridlines(true);
  
  // Add a border around the entire content area - updated to encompass all content
  sheet.getRange(`A1:H${actualRows}`).setBorder(true, true, true, true, false, false, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
  
  // Clear any existing conditional formatting rules first
  sheet.clearConditionalFormatRules();
  
  // Add conditional formatting for high numbers (but only for data rows, not instruction rows)
  const criticalRange = sheet.getRange('E14:E34'); // 90+ days column (only data rows)
  const criticalRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(5) // Lowered threshold to be more visible
    .setBackground('#ffebee')
    .setRanges([criticalRange])
    .build();
  
  const urgentRange = sheet.getRange('B14:B34'); // 0-7 days column (only data rows)
  const urgentRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(5) // Lowered threshold to be more visible
    .setBackground('#fff3e0')
    .setRanges([urgentRange])
    .build();
  
  const rules = [criticalRule, urgentRule];
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
 * Get incident severity from platform-specific data
 */
function getIncidentSeverity(incident) {
  if (incident.platform === 'incident.io') {
    // incident.io uses severity.name
    return incident.severity?.name || 'Unknown';
  } else if (incident.platform === 'firehydrant') {
    // FireHydrant severity might be a string or object
    if (typeof incident.severity === 'string') {
      return incident.severity;
    } else if (incident.severity?.name) {
      return incident.severity.name;
    } else if (incident.severity?.value) {
      return incident.severity.value;
    }
    return 'Unknown';
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
 * Create README sheet with comprehensive documentation - Simplified version
 */
function createReadmeSheetSimple() {
  console.log('📚 Creating README sheet (simplified)...');
  
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
    }
    
    // Write content in smaller batches to avoid errors
    writeReadmeContent(readmeSheet);
    
    console.log('✅ README sheet created successfully');
    
    // Show success message
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '📚 README Sheet Updated',
      'README sheet has been successfully updated with v2.2.0 information!',
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
 * Write README content in smaller batches
 */
function writeReadmeContent(sheet) {
  // Write content in smaller sections to avoid execution limits
  
  // Section 1: Header and Overview
  const section1 = [
    ['📚 MISSING FIELDS REPORT - SYSTEM DOCUMENTATION'],
    [''],
    ['🎯 SYSTEM OVERVIEW'],
    ['This automated system monitors incidents across incident.io and FireHydrant platforms'],
    ['to identify missing required fields and send daily email notifications.'],
    [''],
    ['⚙️ HOW IT WORKS'],
    ['1. Daily at 9:00 AM, the system automatically fetches incidents from all platforms'],
    ['2. Filters incidents based on specific criteria (status, type, mode)'],
    ['3. Validates required fields for each business unit'],
    ['4. Sends email notifications for incidents with missing fields'],
    ['5. Updates tracking sheets with current data']
  ];
  
  sheet.getRange(1, 1, section1.length, 1).setValues(section1);
  
  // Section 2: Business Unit Mapping
  const section2 = [
    [''],
    ['🏢 BUSINESS UNIT & PLATFORM MAPPING'],
    ['Business Unit', 'Platform', 'API Source', 'Required Fields'],
    ['Square', 'incident.io', 'api.incident.io/v2', 'Affected Markets, Causal Type, Stabilization Type, Impact Start Date, Transcript URL'],
    ['Cash', 'incident.io', 'api.incident.io/v2', 'Affected Markets, Causal Type, Stabilization Type, Impact Start Date, Transcript URL'],
    ['Afterpay', 'FireHydrant', 'api.firehydrant.io/v1', 'Market']
  ];
  
  const startRow2 = section1.length + 1;
  sheet.getRange(startRow2, 1, section2.length, 4).setValues(section2.map(row => {
    while (row.length < 4) row.push('');
    return row;
  }));
  
  // Section 3: Filtering Criteria
  const section3 = [
    [''],
    ['🔍 FILTERING CRITERIA'],
    [''],
    ['INCIDENT.IO FILTERING (Square & Cash):'],
    ['✅ INCLUDED Statuses: Stabilized, Postmortem Prep, Postmortem Meeting Prep, Closed'],
    ['✅ INCLUDED Modes: standard, retrospective'],
    ['❌ EXCLUDED Types: [TEST], [Preemptive SEV]'],
    [''],
    ['FIREHYDRANT FILTERING (Afterpay):'],
    ['✅ INCLUDED Statuses: Stabilized, Remediation, Resolved, Retrospective Started, Retrospective Completed, Closed'],
    ['✅ INCLUDED Modes: standard, retrospective'],
    ['❌ EXCLUDED Types: [TEST], [Preemptive SEV]']
  ];
  
  const startRow3 = startRow2 + section2.length;
  sheet.getRange(startRow3, 1, section3.length, 1).setValues(section3);
  
  // Section 4: Severity Filtering
  const section4 = [
    [''],
    ['🎯 SEVERITY FILTERING (NEW FEATURE)'],
    [''],
    ['CONFIGURATION: Set in Config sheet parameters:'],
    ['• enableSeverityFiltering: true/false (enables/disables filtering)'],
    ['• incidentioSeverities: Array of severities to include (e.g., SEV0,SEV1,SEV2)'],
    ['• includeInternalImpact: true/false (includes Internal Impact variants)'],
    ['• firehydrantSeverities: Array of severities to include (e.g., SEV0,SEV1,SEV2)'],
    [''],
    ['BEHAVIOR WHEN ENABLED:'],
    ['✅ INCLUDED: Only incidents matching specified severity levels'],
    ['✅ INTERNAL IMPACT: incident.io severities with "Internal Impact" suffix included if enabled'],
    ['❌ EXCLUDED: All other severity levels filtered out'],
    [''],
    ['BEHAVIOR WHEN DISABLED:'],
    ['✅ ALL SEVERITIES: No severity filtering applied (default behavior)']
  ];
  
  const startRow4 = startRow3 + section3.length;
  sheet.getRange(startRow4, 1, section4.length, 1).setValues(section4);
  
  // Continue with remaining sections...
  writeReadmeContentPart2(sheet, startRow4 + section4.length);
}

/**
 * Write remaining README content
 */
function writeReadmeContentPart2(sheet, startRow) {
  // Section 5: Date Bucket System
  const section5 = [
    [''],
    ['📅 DATE BUCKET SYSTEM'],
    ['The system categorizes incidents into age-based buckets for reporting:'],
    [''],
    ['Bucket', 'Age Range', 'Email Treatment', 'Purpose'],
    ['0-7 days', 'Last 7 days', 'Full details shown', 'Immediate action required'],
    ['7-30 days', '7-30 days old', 'Count summary only', 'Recent but not urgent'],
    ['30-90 days', '30-90 days old', 'Count summary only', 'Older incidents'],
    ['90+ days', '90+ days old', 'Count summary only', 'Historical tracking']
  ];
  
  sheet.getRange(startRow, 1, section5.length, 4).setValues(section5.map(row => {
    while (row.length < 4) row.push('');
    return row;
  }));
  
  // Section 6: Manual Actions
  const section6 = [
    [''],
    ['🔧 MANUAL ACTIONS'],
    [''],
    ['🔄 Check Missing Fields Now: Run immediate check and update all sheets'],
    ['📧 Send Test Email: Send test notification to verify email delivery'],
    ['🔧 Setup Daily Automation: Configure daily 9 AM automated checks'],
    ['🛑 Cancel Daily Automation: Disable automated daily checks'],
    ['📊 Show Automation Status: View current automation trigger status'],
    ['🔗 Test API Connections: Verify connectivity to all platforms']
  ];
  
  const startRow6 = startRow + section5.length;
  sheet.getRange(startRow6, 1, section6.length, 1).setValues(section6);
  
  // Section 7: System Information
  const section7 = [
    [''],
    ['📋 SYSTEM INFORMATION'],
    [''],
    ['Version: v2.2.0'],
    ['Last Updated: ' + new Date().toLocaleDateString()],
    ['Platforms: incident.io (Square, Cash), FireHydrant (Afterpay)'],
    ['Data Retention: 365 days (12 months)'],
    ['Email Focus: Last 7 days (detailed), older incidents summarized'],
    ['Update Frequency: Daily at 9:00 AM']
  ];
  
  const startRow7 = startRow6 + section6.length;
  sheet.getRange(startRow7, 1, section7.length, 1).setValues(section7);
  
  // Apply basic formatting
  formatReadmeSheetSimple(sheet);
}

/**
 * Apply basic formatting to README sheet
 */
function formatReadmeSheetSimple(sheet) {
  try {
    // Set column widths
    sheet.setColumnWidth(1, 400);
    sheet.setColumnWidth(2, 250);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 200);
    
    // Format title (Row 1)
    sheet.getRange('A1').setBackground('#1f4e79')
                        .setFontColor('#ffffff')
                        .setFontWeight('bold')
                        .setFontSize(16);
    
    console.log('✅ Basic formatting applied');
    
  } catch (error) {
    console.log('⚠️ Formatting failed, but content was written:', error.toString());
  }
}

/**
 * Apply comprehensive formatting to README sheet (run separately after content is written)
 */
function formatReadmeSheetComprehensive() {
  console.log('🎨 Applying comprehensive formatting to README sheet...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('README');
    
    if (!sheet) {
      throw new Error('README sheet not found');
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow === 0 || lastCol === 0) {
      throw new Error('No data in README sheet to format');
    }
    
    console.log(`📊 Formatting ${lastRow} rows and ${lastCol} columns`);
    
    // Set column widths
    sheet.setColumnWidth(1, 450); // Main content - wider for readability
    sheet.setColumnWidth(2, 280); // Secondary content
    sheet.setColumnWidth(3, 180); // Tertiary content
    sheet.setColumnWidth(4, 220); // Additional content
    
    // Format title (Row 1)
    const titleRange = sheet.getRange(1, 1, 1, Math.min(4, lastCol));
    titleRange.merge()
             .setBackground('#1f4e79')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setFontSize(18)
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle');
    
    // Find and format section headers (rows that start with emoji)
    console.log('🔍 Finding and formatting section headers...');
    for (let row = 1; row <= lastRow; row++) {
      try {
        const cellValue = sheet.getRange(row, 1).getValue().toString();
        
        // Check if this is a section header (starts with emoji)
        if (cellValue.match(/^[🎯⚙️🏢🔍📅📊📧🔧🛠️🗺️📋]/)) {
          const headerRange = sheet.getRange(row, 1, 1, Math.min(4, lastCol));
          headerRange.setBackground('#4285f4')
                     .setFontColor('#ffffff')
                     .setFontWeight('bold')
                     .setFontSize(14);
          console.log(`   ✅ Formatted section header: ${cellValue.substring(0, 30)}...`);
        }
        
        // Check if this is a table header row
        if (cellValue === 'Business Unit' || cellValue === 'Bucket' || 
            cellValue === 'Required Field' || cellValue.includes('INCLUDED') || 
            cellValue.includes('EXCLUDED')) {
          const headerRange = sheet.getRange(row, 1, 1, Math.min(4, lastCol));
          headerRange.setBackground('#e8f0fe')
                     .setFontWeight('bold')
                     .setHorizontalAlignment('center')
                     .setBorder(true, true, true, true, true, true, '#4285f4', SpreadsheetApp.BorderStyle.SOLID);
          console.log(`   ✅ Formatted table header: ${cellValue}`);
        }
        
        // Format configuration bullet points
        if (cellValue.startsWith('•') || cellValue.startsWith('✅') || cellValue.startsWith('❌')) {
          sheet.getRange(row, 1).setFontWeight('bold');
        }
        
      } catch (error) {
        // Skip problematic rows
        console.log(`⚠️ Skipping formatting for row ${row}: ${error.toString()}`);
      }
    }
    
    // Format specific known sections
    console.log('🎨 Applying section-specific formatting...');
    
    // Format business unit mapping table (look for the table)
    for (let row = 1; row <= lastRow; row++) {
      const cellValue = sheet.getRange(row, 1).getValue().toString();
      if (cellValue === 'Square' || cellValue === 'Cash' || cellValue === 'Afterpay') {
        // This is likely the business unit table
        const tableRange = sheet.getRange(row, 1, 1, 4);
        tableRange.setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
        
        // Color code by business unit
        if (cellValue === 'Square') {
          tableRange.setBackground('#fff2cc'); // Light yellow
        } else if (cellValue === 'Cash') {
          tableRange.setBackground('#d9ead3'); // Light green
        } else if (cellValue === 'Afterpay') {
          tableRange.setBackground('#cfe2f3'); // Light blue
        }
      }
    }
    
    // Format date bucket table
    for (let row = 1; row <= lastRow; row++) {
      const cellValue = sheet.getRange(row, 1).getValue().toString();
      if (cellValue === '0-7 days' || cellValue === '7-30 days' || 
          cellValue === '30-90 days' || cellValue === '90+ days') {
        const tableRange = sheet.getRange(row, 1, 1, 4);
        tableRange.setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
        
        // Color code by urgency
        if (cellValue === '0-7 days') {
          tableRange.setBackground('#fce5cd'); // Light orange (urgent)
        } else if (cellValue === '7-30 days') {
          tableRange.setBackground('#fff2cc'); // Light yellow
        } else {
          tableRange.setBackground('#f4cccc'); // Light red (older)
        }
      }
    }
    
    // Remove gridlines
    sheet.setHiddenGridlines(true);
    
    // Add border around entire content
    if (lastRow > 0 && lastCol > 0) {
      sheet.getRange(1, 1, lastRow, Math.min(4, lastCol))
           .setBorder(true, true, true, true, false, false, '#1f4e79', SpreadsheetApp.BorderStyle.SOLID_THICK);
    }
    
    // Freeze first row
    sheet.setFrozenRows(1);
    
    console.log('✅ Comprehensive formatting applied successfully');
    
    // Show success message
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🎨 README Formatting Complete',
      'Beautiful formatting has been applied to your README sheet!\n\n' +
      '• Section headers highlighted in blue\n' +
      '• Business units color-coded\n' +
      '• Date buckets color-coded by urgency\n' +
      '• Table borders and styling applied\n' +
      '• Professional layout restored',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Failed to format README sheet:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Formatting Failed',
      `Failed to format README sheet:\n\n${error.toString()}\n\nThe content is there, but formatting needs to be applied manually.`,
      ui.ButtonSet.OK
    );
  }
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
    
    // Prepare README content - simplified to avoid array size issues
    const readmeContent = [];
    
    // Add content in smaller chunks
    readmeContent.push(
      ['📚 MISSING FIELDS REPORT - SYSTEM DOCUMENTATION'],
      [''],
      ['🎯 SYSTEM OVERVIEW'],
      ['This automated system monitors incidents across incident.io and FireHydrant platforms'],
      ['to identify missing required fields and send daily email notifications.'],
      [''],
      ['⚙️ HOW IT WORKS'],
      ['1. Daily at 9:00 AM, the system automatically fetches incidents from all platforms'],
      ['2. Filters incidents based on specific criteria (status, type, mode)'],
      ['3. Validates required fields for each business unit'],
      ['4. Sends email notifications for incidents with missing fields'],
      ['5. Updates tracking sheets with current data'],
      [''],
      ['🏢 BUSINESS UNIT & PLATFORM MAPPING'],
      ['Business Unit', 'Platform', 'API Source', 'Required Fields'],
      ['Square', 'incident.io', 'api.incident.io/v2', 'Affected Markets, Causal Type, Stabilization Type, Impact Start Date, Transcript URL'],
      ['Cash', 'incident.io', 'api.incident.io/v2', 'Affected Markets, Causal Type, Stabilization Type, Impact Start Date, Transcript URL'],
      ['Afterpay', 'FireHydrant', 'api.firehydrant.io/v1', 'Market'],
      [''],
      ['🔍 FILTERING CRITERIA'],
      [''],
      ['INCIDENT.IO FILTERING (Square & Cash):'],
      ['✅ INCLUDED Statuses:', 'Stabilized, Postmortem Prep, Postmortem Meeting Prep, Closed'],
      ['✅ INCLUDED Modes:', 'standard, retrospective'],
      ['❌ EXCLUDED Types:', '[TEST], [Preemptive SEV]'],
      [''],
      ['FIREHYDRANT FILTERING (Afterpay):'],
      ['✅ INCLUDED Statuses:', 'Stabilized, Remediation, Resolved, Retrospective Started, Retrospective Completed, Closed'],
      ['✅ INCLUDED Modes:', 'standard, retrospective'],
      ['❌ EXCLUDED Types:', '[TEST], [Preemptive SEV]'],
      [''],
      ['🎯 SEVERITY FILTERING (NEW FEATURE)'],
      [''],
      ['CONFIGURATION: Set in Config sheet parameters:'],
      ['• enableSeverityFiltering: true/false (enables/disables filtering)'],
      ['• incidentioSeverities: Array of severities to include (e.g., SEV0,SEV1,SEV2)'],
      ['• includeInternalImpact: true/false (includes Internal Impact variants)'],
      ['• firehydrantSeverities: Array of severities to include (e.g., SEV0,SEV1,SEV2)'],
      [''],
      ['BEHAVIOR WHEN ENABLED:'],
      ['✅ INCLUDED: Only incidents matching specified severity levels'],
      ['✅ INTERNAL IMPACT: incident.io severities with "Internal Impact" suffix included if enabled'],
      ['❌ EXCLUDED: All other severity levels filtered out'],
      [''],
      ['BEHAVIOR WHEN DISABLED:'],
      ['✅ ALL SEVERITIES: No severity filtering applied (default behavior)'],
      [''],
      ['📅 DATE BUCKET SYSTEM'],
      ['The system categorizes incidents into age-based buckets for reporting:'],
      [''],
      ['Bucket', 'Age Range', 'Email Treatment', 'Purpose'],
      ['0-7 days', 'Last 7 days', 'Full details shown', 'Immediate action required'],
      ['7-30 days', '7-30 days old', 'Count summary only', 'Recent but not urgent'],
      ['30-90 days', '30-90 days old', 'Count summary only', 'Older incidents'],
      ['90+ days', '90+ days old', 'Count summary only', 'Historical tracking'],
      [''],
      ['📊 SHEET DESCRIPTIONS'],
      [''],
      ['SUMMARY SHEET: Executive dashboard with key metrics and breakdowns'],
      ['TRACKING SHEET: Detailed list of all incidents with missing fields'],
      ['CONFIG SHEET: System configuration parameters and API keys'],
      ['LOGS SHEET: Execution history and system performance'],
      [''],
      ['📧 EMAIL NOTIFICATIONS'],
      [''],
      ['WHEN SENT: Daily at 9:00 AM (automated) or manual runs'],
      ['CONTENT: Recent incidents (7 days) with full details, older incidents summarized'],
      ['COLORS: Black=Square, Green=Cash, Blue=Afterpay'],
      [''],
      ['🔧 MANUAL ACTIONS'],
      [''],
      ['🔄 Check Missing Fields Now: Run immediate check and update all sheets'],
      ['📧 Send Test Email: Send test notification to verify email delivery'],
      ['🔧 Setup Daily Automation: Configure daily 9 AM automated checks'],
      ['🛑 Cancel Daily Automation: Disable automated daily checks'],
      ['📊 Show Automation Status: View current automation trigger status'],
      ['🔗 Test API Connections: Verify connectivity to all platforms'],
      [''],
      ['🛠️ TROUBLESHOOTING'],
      [''],
      ['No data in sheets: Check API connections, verify API keys in Config sheet'],
      ['Emails not sent: Verify email recipients in Config sheet, check automation status'],
      ['Wrong incidents tracked: Review filtering criteria above'],
      ['Automation not running: Use "Show Automation Status", re-setup if needed'],
      [''],
      ['🗺️ FIELD MAPPING DETAILS'],
      [''],
      ['INCIDENT.IO FIELD MAPPING:'],
      ['Required Field', 'Possible API Field Names'],
      ['Affected Markets', 'Affected Markets, Affected Market(s), Markets Affected, Impacted Markets'],
      ['Causal Type', 'Causal Type, CAUSAL TYPE'],
      ['Stabilization Type', 'Stabilisation Type, Stabilization Type, STABILISATION TYPE, STABILIZATION TYPE'],
      ['Impact Start Date', 'Impact Start (via V2 timestamps endpoint)'],
      ['Transcript URL', 'Google Meet Transcript (custom field)'],
      [''],
      ['FIREHYDRANT FIELD MAPPING:'],
      ['Required Field', 'Possible API Field Names'],
      ['Market', 'market, Market, markets, Markets'],
      [''],
      ['📋 SYSTEM INFORMATION'],
      [''],
      ['Version: v2.2.0'],
      ['Last Updated: ' + new Date().toLocaleDateString()],
      ['Platforms: incident.io (Square, Cash), FireHydrant (Afterpay)'],
      ['Data Retention: 365 days (12 months)'],
      ['Email Focus: Last 7 days (detailed), older incidents summarized'],
      ['Update Frequency: Daily at 9:00 AM']
    );
    
    // Write content to sheet
    if (readmeContent.length > 0) {
      // Determine the maximum number of columns needed
      const maxCols = Math.max(...readmeContent.map(row => row.length));
      const normalizedContent = readmeContent.map(row => {
        // Pad rows to have consistent column count
        while (row.length < maxCols) {
          row.push('');
        }
        return row;
      });
      
      readmeSheet.getRange(1, 1, normalizedContent.length, maxCols).setValues(normalizedContent);
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
  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow === 0 || lastCol === 0) {
      console.log('⚠️ No data in README sheet to format');
      return;
    }
    
    // Set column widths
    sheet.setColumnWidth(1, 400); // Main content - wider for readability
    sheet.setColumnWidth(2, 250); // Secondary content
    sheet.setColumnWidth(3, 150); // Tertiary content
    sheet.setColumnWidth(4, 200); // Additional content
    
    // Format title (Row 1)
    const titleRange = sheet.getRange(1, 1, 1, Math.min(4, lastCol));
    titleRange.merge()
             .setBackground('#1f4e79')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setFontSize(16)
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle');
    
    // Find and format section headers (rows that start with emoji)
    for (let row = 1; row <= lastRow; row++) {
      try {
        const cellValue = sheet.getRange(row, 1).getValue().toString();
        
        // Check if this is a section header (starts with emoji)
        if (cellValue.match(/^[🎯⚙️🏢🔍📅📊📧🔧🛠️🗺️📞📋]/)) {
          const headerRange = sheet.getRange(row, 1, 1, Math.min(4, lastCol));
          headerRange.setBackground('#4285f4')
                     .setFontColor('#ffffff')
                     .setFontWeight('bold')
                     .setFontSize(12);
        }
        
        // Check if this is a table header row
        if (cellValue === 'Business Unit' || cellValue === 'Bucket' || 
            cellValue === 'Required Field' || cellValue.includes('INCLUDED') || 
            cellValue.includes('EXCLUDED')) {
          const headerRange = sheet.getRange(row, 1, 1, Math.min(4, lastCol));
          headerRange.setBackground('#e8f0fe')
                     .setFontWeight('bold')
                     .setHorizontalAlignment('center');
        }
      } catch (error) {
        // Skip problematic rows
        console.log(`⚠️ Skipping formatting for row ${row}: ${error.toString()}`);
      }
    }
    
    // Remove gridlines
    sheet.setHiddenGridlines(true);
    
    // Add border around content
    if (lastRow > 0 && lastCol > 0) {
      sheet.getRange(1, 1, lastRow, Math.min(4, lastCol))
           .setBorder(true, true, true, true, false, false, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
    }
    
    // Freeze first row
    sheet.setFrozenRows(1);
    
    console.log('✅ README sheet formatted successfully');
    
  } catch (error) {
    console.error('❌ Error formatting README sheet:', error.toString());
    // Continue without formatting rather than failing
  }
}

/**
 * Get severity filtering summary for display
 */
function getSeverityFilteringSummary(config) {
  const severityFilteringEnabled = config.enableSeverityFiltering || false;
  
  if (!severityFilteringEnabled) {
    return {
      status: '🔍 Severity Filtering: DISABLED',
      criteria: 'All severities included'
    };
  }
  
  const incidentioSeverities = config.incidentioSeverities || [];
  const firehydrantSeverities = config.firehydrantSeverities || [];
  const includeInternalImpact = config.includeInternalImpact !== false;
  
  const incidentioText = incidentioSeverities.length > 0 ? incidentioSeverities.join(',') : 'None';
  const firehydrantText = firehydrantSeverities.length > 0 ? firehydrantSeverities.join(',') : 'None';
  const internalText = includeInternalImpact ? ' (+Internal)' : '';
  
  return {
    status: '🔍 Severity Filtering: ENABLED',
    criteria: `incident.io: ${incidentioText}${internalText} | FireHydrant: ${firehydrantText}`
  };
}

/**
 * Format lookback period into user-friendly text
 */
function formatLookbackPeriod(maxLookbackDays) {
  if (maxLookbackDays <= 7) {
    return `Last ${maxLookbackDays} day${maxLookbackDays !== 1 ? 's' : ''}`;
  } else if (maxLookbackDays <= 30) {
    return `Last ${maxLookbackDays} days`;
  } else if (maxLookbackDays <= 90) {
    const weeks = Math.floor(maxLookbackDays / 7);
    if (maxLookbackDays % 7 === 0) {
      return `Last ${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else {
      return `Last ${maxLookbackDays} days`;
    }
  } else if (maxLookbackDays <= 365) {
    const months = Math.floor(maxLookbackDays / 30);
    if (maxLookbackDays % 30 === 0) {
      return `Last ${months} month${months !== 1 ? 's' : ''}`;
    } else {
      return `Last ${maxLookbackDays} days`;
    }
  } else {
    const years = Math.floor(maxLookbackDays / 365);
    if (maxLookbackDays % 365 === 0) {
      return `Last ${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `Last ${maxLookbackDays} days`;
    }
  }
}

/**
 * Get available age buckets based on lookback period - FIXED THE BUG!
 */
function getAvailableAgeBuckets(maxLookbackDays) {
  const buckets = {
    '0-7 days': maxLookbackDays >= 7,
    '7-30 days': maxLookbackDays >= 30,
    '30-90 days': maxLookbackDays >= 30,  // ✅ FIXED: Show 30-90 day data if we have 30+ day lookback
    '90+ days': maxLookbackDays >= 90     // Only show 90+ if we actually have 90+ day lookback
  };
  
  return buckets;
}

/**
 * Get lookback period summary for display
 */
function getLookbackPeriodSummary(config) {
  const maxLookbackDays = config.maxLookbackDays || 365;
  const userFriendlyPeriod = formatLookbackPeriod(maxLookbackDays);
  const availableBuckets = getAvailableAgeBuckets(maxLookbackDays);
  
  // Count available buckets
  const availableBucketCount = Object.values(availableBuckets).filter(Boolean).length;
  const totalBuckets = Object.keys(availableBuckets).length;
  
  return {
    period: userFriendlyPeriod,
    days: maxLookbackDays,
    availableBuckets: availableBuckets,
    summary: `Data Period: ${userFriendlyPeriod}`,
    detailedSummary: `Data Period: ${userFriendlyPeriod} (${availableBucketCount}/${totalBuckets} age buckets available)` // Keep for debugging if needed
  };
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

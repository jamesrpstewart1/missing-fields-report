/**
 * Date Range Enhancement for Missing Fields Report
 * This shows how to extend the existing system with custom date ranges
 */

/**
 * Enhanced configuration parsing to support date ranges
 */
function getEnhancedConfiguration() {
  const config = getConfiguration(); // Your existing function
  
  // Add date range logic
  const useCustomDateRange = config.useCustomDateRange || false;
  const dateRangeMode = config.dateRangeMode || 'lookback';
  
  if (useCustomDateRange && dateRangeMode === 'range') {
    // Use custom date range
    config.startDate = config.customStartDate ? new Date(config.customStartDate) : null;
    config.endDate = config.customEndDate ? new Date(config.customEndDate) : null;
    config.isCustomRange = true;
  } else if (useCustomDateRange && config.dateRangePreset) {
    // Use preset date range
    const dateRange = getPresetDateRange(config.dateRangePreset);
    config.startDate = dateRange.start;
    config.endDate = dateRange.end;
    config.isCustomRange = true;
  } else {
    // Use existing lookback logic
    const lookbackDays = config.maxLookbackDays || 30;
    config.startDate = new Date(Date.now() - (lookbackDays * 24 * 60 * 60 * 1000));
    config.endDate = new Date();
    config.isCustomRange = false;
  }
  
  return config;
}

/**
 * Get preset date ranges
 */
function getPresetDateRange(preset) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  switch (preset) {
    case 'current_month':
      return {
        start: new Date(currentYear, currentMonth, 1),
        end: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
      };
      
    case 'last_month':
      return {
        start: new Date(currentYear, currentMonth - 1, 1),
        end: new Date(currentYear, currentMonth, 0, 23, 59, 59)
      };
      
    case 'current_quarter':
      const quarterStart = Math.floor(currentMonth / 3) * 3;
      return {
        start: new Date(currentYear, quarterStart, 1),
        end: new Date(currentYear, quarterStart + 3, 0, 23, 59, 59)
      };
      
    case 'last_quarter':
      const lastQuarterStart = Math.floor(currentMonth / 3) * 3 - 3;
      const lastQuarterYear = lastQuarterStart < 0 ? currentYear - 1 : currentYear;
      const adjustedQuarterStart = lastQuarterStart < 0 ? 9 : lastQuarterStart;
      return {
        start: new Date(lastQuarterYear, adjustedQuarterStart, 1),
        end: new Date(lastQuarterYear, adjustedQuarterStart + 3, 0, 23, 59, 59)
      };
      
    case 'ytd':
      return {
        start: new Date(currentYear, 0, 1),
        end: now
      };
      
    default:
      // Fallback to lookback
      const lookbackDays = 30;
      return {
        start: new Date(Date.now() - (lookbackDays * 24 * 60 * 60 * 1000)),
        end: now
      };
  }
}

/**
 * Enhanced incident filtering with date range support
 */
function filterIncidentsByDateRange(incidents, config) {
  if (!config.startDate || !config.endDate) {
    return incidents; // No filtering if dates not set
  }
  
  return incidents.filter(incident => {
    const incidentDate = new Date(incident.created_at);
    return incidentDate >= config.startDate && incidentDate <= config.endDate;
  });
}

/**
 * Enhanced date bucket calculation for custom ranges
 */
function calculateEnhancedDateBucket(createdAt, config) {
  if (!config.isCustomRange) {
    return calculateDateBucket(createdAt); // Use existing function
  }
  
  // For custom ranges, create buckets based on the range duration
  const createdDate = new Date(createdAt);
  const rangeStart = config.startDate;
  const rangeEnd = config.endDate;
  const rangeDuration = Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24));
  
  const daysFromStart = Math.ceil((createdDate - rangeStart) / (1000 * 60 * 60 * 24));
  
  if (rangeDuration <= 7) {
    // Short range - use daily buckets
    return `Day ${daysFromStart}`;
  } else if (rangeDuration <= 30) {
    // Monthly range - use weekly buckets
    const week = Math.ceil(daysFromStart / 7);
    return `Week ${week}`;
  } else if (rangeDuration <= 90) {
    // Quarterly range - use monthly buckets
    const month = Math.ceil(daysFromStart / 30);
    return `Month ${month}`;
  } else {
    // Longer range - use quarterly buckets
    const quarter = Math.ceil(daysFromStart / 90);
    return `Quarter ${quarter}`;
  }
}

/**
 * Enhanced summary generation with date range info
 */
function generateEnhancedSummary(incidents, config) {
  let dateRangeDescription;
  
  if (config.isCustomRange) {
    const startStr = config.startDate.toLocaleDateString();
    const endStr = config.endDate.toLocaleDateString();
    dateRangeDescription = `Custom Range: ${startStr} to ${endStr}`;
  } else {
    const lookbackDays = config.maxLookbackDays || 30;
    dateRangeDescription = `Last ${lookbackDays} days`;
  }
  
  return {
    dateRange: dateRangeDescription,
    totalIncidents: incidents.length,
    // ... other summary data
  };
}

/**
 * Example usage in your main function
 */
function runEnhancedMissingFieldsCheck() {
  console.log('🔍 Running enhanced missing fields check with date range support...');
  
  // Get enhanced configuration
  const config = getEnhancedConfiguration();
  
  console.log(`📅 Date range: ${config.startDate.toLocaleDateString()} to ${config.endDate.toLocaleDateString()}`);
  console.log(`🔧 Mode: ${config.isCustomRange ? 'Custom Range' : 'Lookback'}`);
  
  // Fetch incidents (your existing logic)
  let allIncidents = [];
  // ... fetch from APIs ...
  
  // Apply date range filtering
  const filteredIncidents = filterIncidentsByDateRange(allIncidents, config);
  
  console.log(`📊 Found ${filteredIncidents.length} incidents in date range`);
  
  // Continue with your existing logic...
  // validateIncidents(filteredIncidents, config);
  // updateSheets(filteredIncidents, config);
  // etc.
}

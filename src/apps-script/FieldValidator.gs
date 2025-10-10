/**
 * Field Validation Module
 * Validates required fields across different platforms
 */

/**
 * Validate required fields for all incidents (platform-specific)
 */
function validateRequiredFields(incidents) {
  console.log(`🔍 Validating required fields for ${incidents.length} incidents...`);
  
  const incidentsWithMissingFields = [];
  
  incidents.forEach(incident => {
    const missingFields = [];
    
    // Get platform-specific required fields
    const requiredFields = getPlatformRequiredFields(incident.platform);
    
    // Check each required field for this platform
    requiredFields.forEach(fieldName => {
      if (!hasRequiredField(incident, fieldName)) {
        missingFields.push(fieldName);
      }
    });
    
    if (missingFields.length > 0) {
      incidentsWithMissingFields.push({
        ...incident,
        missingFields: missingFields
      });
    }
  });
  
  console.log(`⚠️ Found ${incidentsWithMissingFields.length} incidents with missing fields`);
  return incidentsWithMissingFields;
}

/**
 * Get required fields for a specific platform
 */
function getPlatformRequiredFields(platform) {
  if (platform === 'incident.io') {
    return [
      'Affected Markets', 
      'Causal Type', 
      'Stabilization Type',
      'Impact Start',  // Impact start timestamp
      'Stabilized at'  // Stabilized timestamp
    ];
  } else if (platform === 'firehydrant') {
    return ['Market']; // Only Market field for FireHydrant/Afterpay
  }
  
  // Default fallback
  return REQUIRED_FIELDS;
}

/**
 * Check if incident has a required field populated
 */
function hasRequiredField(incident, fieldName) {
  let fieldValue = '';
  
  if (incident.platform === 'incident.io') {
    // Handle incident.io field mapping
    fieldValue = getIncidentIOFieldValue(incident, fieldName);
  } else if (incident.platform === 'firehydrant') {
    // Handle FireHydrant field mapping
    fieldValue = getFireHydrantFieldValueMapped(incident, fieldName);
  }
  
  // Consider field missing if it's empty, null, undefined, or whitespace-only
  return fieldValue && fieldValue.trim().length > 0;
}

/**
 * Get field value from incident.io incident with field name mapping
 */
function getIncidentIOFieldValue(incident, fieldName) {
  // Handle Impact Start - check custom timestamps
  if (fieldName === 'Impact Start') {
    // TODO: Need to investigate incident.io custom timestamps structure
    // This will be implemented after deeper research
    return getImpactStartTimestamp(incident);
  }
  
  // Handle Stabilized at - check custom timestamps
  if (fieldName === 'Stabilized at') {
    return getStabilizedAtTimestamp(incident);
  }
  
  // Map required field names to actual incident.io field names
  const fieldMapping = {
    'Affected Markets': ['Affected Markets', 'Affected Market(s)', 'Markets Affected', 'Impacted Markets'],
    'Causal Type': ['Causal Type', 'CAUSAL TYPE'],
    'Stabilization Type': ['Stabilisation Type', 'Stabilization Type', 'STABILISATION TYPE', 'STABILIZATION TYPE']
  };
  
  const possibleFieldNames = fieldMapping[fieldName] || [fieldName];
  
  // Try each possible field name
  for (const possibleName of possibleFieldNames) {
    const values = getCustomFieldValue(incident, possibleName);
    if (values.length > 0 && values[0] && values[0].trim()) {
      return values[0].trim();
    }
  }
  
  return '';
}

/**
 * Get Impact Start timestamp from incident.io incident using V2 timestamps endpoint
 */
function getImpactStartTimestamp(incident) {
  // Use incident_timestamp_values structure (not incident_timestamps)
  if (!incident.incident_timestamp_values) {
    return incident.occurred_at || ''; // Fallback to occurred_at
  }
  
  // Handle case sensitivity differences between Square and Cash APIs
  let timestampEntry = incident.incident_timestamp_values.find(entry => 
    entry.incident_timestamp.name === 'Impact Start'
  );
  
  // Try lowercase 's' for Cash API if not found
  if (!timestampEntry) {
    timestampEntry = incident.incident_timestamp_values.find(entry => 
      entry.incident_timestamp.name === 'Impact start'
    );
  }
  
  return timestampEntry?.value?.value || incident.occurred_at || '';
}

/**
 * Get Stabilized at timestamp from incident.io incident using V2 timestamps endpoint
 */
function getStabilizedAtTimestamp(incident) {
  // Use incident_timestamp_values structure (not incident_timestamps)
  if (!incident.incident_timestamp_values) {
    return ''; // No fallback for stabilized timestamp
  }
  
  // Handle case sensitivity differences between Square and Cash APIs
  let timestampEntry = incident.incident_timestamp_values.find(entry => 
    entry.incident_timestamp.name === 'Stabilized at'
  );
  
  // Try alternative names if not found
  if (!timestampEntry) {
    timestampEntry = incident.incident_timestamp_values.find(entry => 
      entry.incident_timestamp.name === 'Stabilised at' ||
      entry.incident_timestamp.name === 'Stabilized' ||
      entry.incident_timestamp.name === 'Stabilised'
    );
  }
  
  return timestampEntry?.value?.value || '';
}

/**
 * Debug function to check available timestamp names for an incident
 */
function debugIncidentTimestamps(incidentId, businessUnit = 'square') {
  try {
    const apiConfig = CONFIG.incidentio[businessUnit.toLowerCase()];
    if (!apiConfig || !apiConfig.apiKey) {
      console.log('⚠️ No API config for timestamp debug');
      return {};
    }
    
    // Call the incident timestamps V2 endpoint
    const timestampsUrl = `${apiConfig.baseUrl}/incident_timestamps?incident_id=${incidentId}`;
    
    const response = UrlFetchApp.fetch(timestampsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.getResponseCode() === 200) {
      const timestampsData = JSON.parse(response.getContentText());
      console.log('🔍 Available timestamps for incident', incidentId, ':', JSON.stringify(timestampsData, null, 2));
      return timestampsData;
    } else {
      console.log('❌ Failed to fetch timestamps. Status:', response.getResponseCode());
      return {};
    }
    
  } catch (error) {
    console.error('❌ Error debugging timestamps:', error.toString());
    return {};
  }
}

/**
 * Test function specifically for INC-6071 debugging
 */
function testDebugINC6071() {
  console.log('🔍 Debugging INC-6071 timestamp fields...');
  const result = debugIncidentTimestamps('INC-6071', 'square');
  console.log('📋 Debug result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Test function specifically for Cash incident INC-6287 debugging
 */
function testDebugCashINC6287() {
  console.log('🔍 Debugging Cash INC-6287 timestamp fields...');
  const result = debugIncidentTimestamps('INC-6287', 'cash');
  console.log('📋 Debug result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Test Time to Respond field extraction on a recent incident
 */
function testTimeToRespondExtraction() {
  console.log('🔍 Testing Time to Respond field extraction...');
  
  // Test with INC-6071 (Square) - we know this incident works
  const result = debugIncidentTimestamps('INC-6071', 'square');
  console.log('📋 Available timestamps for INC-6071:', JSON.stringify(result, null, 2));
  
  return result;
}

/**
 * Get Time to Stabilize timestamp from incident.io incident using V2 timestamps endpoint
 */
function getTimeToStabilizeTimestamp(incident) {
  // Time to Stabilize is in duration_metrics, not timestamps!
  if (!incident.duration_metrics) {
    return '';
  }
  
  const durationEntry = incident.duration_metrics.find(entry => 
    entry.duration_metric.name === 'Time to Stabilize'
  );
  
  if (!durationEntry?.value_seconds) {
    return '';
  }
  
  // Convert seconds to hours and minutes for better readability
  const totalSeconds = durationEntry.value_seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${totalSeconds}s`;
  }
}

/**
 * Get Time to Respond duration from incident.io incident using duration_metrics
 */
function getTimeToRespondTimestamp(incident) {
  // Time to Respond is in duration_metrics, similar to Time to Stabilize
  if (!incident.duration_metrics) {
    return '';
  }
  
  const durationEntry = incident.duration_metrics.find(entry => 
    entry.duration_metric.name === 'Time to Respond'
  );
  
  if (!durationEntry?.value_seconds) {
    return '';
  }
  
  // Convert seconds to hours and minutes for better readability
  const totalSeconds = durationEntry.value_seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${totalSeconds}s`;
  }
}

/**
 * Get field value from FireHydrant incident with field name mapping
 */
function getFireHydrantFieldValueMapped(incident, fieldName) {
  // Map required field names to FireHydrant custom field keys
  const fieldMapping = {
    'Market': ['market', 'Market', 'markets', 'Markets'], // FireHydrant uses "Market" not "Affected Markets"
    'Causal Type': ['causal_type', 'root_cause_type'], // Not used yet in FireHydrant
    'Stabilization Type': ['stabilization_type', 'resolution_type'] // Not used yet in FireHydrant
  };
  
  const possibleFieldNames = fieldMapping[fieldName] || [fieldName.toLowerCase().replace(/\s+/g, '_')];
  
  // Try each possible field name using the helper function from IncidentAPI.gs
  for (const possibleName of possibleFieldNames) {
    const values = getFireHydrantFieldValue(incident, possibleName);
    if (values.length > 0 && values[0] && values[0].trim()) {
      return values[0].trim();
    }
  }
  
  return '';
}

/**
 * Get summary of missing fields by type
 */
function getMissingFieldsSummary(incidentsWithMissingFields) {
  const summary = {
    totalIncidents: incidentsWithMissingFields.length,
    fieldCounts: {},
    platformCounts: {},
    businessUnitCounts: {}
  };
  
  // Initialize field counts
  REQUIRED_FIELDS.forEach(field => {
    summary.fieldCounts[field] = 0;
  });
  
  // Count missing fields
  incidentsWithMissingFields.forEach(incident => {
    // Count by field
    incident.missingFields.forEach(field => {
      summary.fieldCounts[field]++;
    });
    
    // Count by platform
    const platform = incident.platform;
    summary.platformCounts[platform] = (summary.platformCounts[platform] || 0) + 1;
    
    // Count by business unit
    const businessUnit = incident.businessUnit;
    summary.businessUnitCounts[businessUnit] = (summary.businessUnitCounts[businessUnit] || 0) + 1;
  });
  
  return summary;
}

/**
 * Filter incidents based on finalized criteria
 */
function filterIncidentsByCriteria(incidents, config) {
  console.log(`🔍 Filtering ${incidents.length} incidents by finalized criteria...`);
  
  let filteredIncidents = incidents;
  
  // 1. INCLUDE ONLY specific statuses (platform-specific)
  filteredIncidents = filteredIncidents.filter(incident => {
    const status = incident.incident_status?.name || incident.status || '';
    const platform = incident.platform || '';
    
    // Get platform-specific allowed statuses
    const allowedStatuses = INCIDENT_FILTERING.includeStatuses[platform] || [];
    const isIncluded = allowedStatuses.includes(status);
    
    return isIncluded;
  });
  console.log(`   📊 After platform-specific status inclusion filter: ${filteredIncidents.length} incidents`);
  
  // 2. EXCLUDE specific incident types (finalized decision)
  filteredIncidents = filteredIncidents.filter(incident => {
    const type = incident.incident_type?.name || incident.type || '';
    const shouldExclude = INCIDENT_FILTERING.excludeTypes.some(excludedType => type.includes(excludedType));
    return !shouldExclude;
  });
  console.log(`   📊 After type exclusion filter (${INCIDENT_FILTERING.excludeTypes.join(', ')}): ${filteredIncidents.length} incidents`);
  
  // 3. INCLUDE ONLY specific incident modes (finalized decision)
  filteredIncidents = filteredIncidents.filter(incident => {
    const mode = incident.mode || '';
    const isIncluded = INCIDENT_FILTERING.includeModes.includes(mode);
    return isIncluded;
  });
  console.log(`   📊 After mode inclusion filter (${INCIDENT_FILTERING.includeModes.join(', ')}): ${filteredIncidents.length} incidents`);
  
  console.log(`✅ Final filtered incidents: ${filteredIncidents.length}`);
  return filteredIncidents;
}

/**
 * Categorize incidents by date buckets for multi-tiered reporting
 */
function categorizeIncidentsByDateBuckets(incidents) {
  console.log(`📅 Categorizing ${incidents.length} incidents by date buckets...`);
  
  const now = new Date();
  const buckets = {
    emailFocus: [],     // Last 7 days - detailed in email
    bucket1: [],        // 7-30 days
    bucket2: [],        // 30-60 days
    bucket3: []         // 90+ days
  };
  
  incidents.forEach(incident => {
    const createdAt = new Date(incident.created_at);
    const daysAgo = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    if (daysAgo <= INCIDENT_FILTERING.dateRanges.emailFocus) {
      buckets.emailFocus.push(incident);
    } else if (daysAgo <= INCIDENT_FILTERING.dateRanges.bucket1) {
      buckets.bucket1.push(incident);
    } else if (daysAgo <= INCIDENT_FILTERING.dateRanges.bucket2) {
      buckets.bucket2.push(incident);
    } else {
      buckets.bucket3.push(incident);
    }
  });
  
  console.log(`   📊 Email focus (0-${INCIDENT_FILTERING.dateRanges.emailFocus} days): ${buckets.emailFocus.length} incidents`);
  console.log(`   📊 Bucket 1 (${INCIDENT_FILTERING.dateRanges.emailFocus+1}-${INCIDENT_FILTERING.dateRanges.bucket1} days): ${buckets.bucket1.length} incidents`);
  console.log(`   📊 Bucket 2 (${INCIDENT_FILTERING.dateRanges.bucket1+1}-${INCIDENT_FILTERING.dateRanges.bucket2} days): ${buckets.bucket2.length} incidents`);
  console.log(`   📊 Bucket 3 (${INCIDENT_FILTERING.dateRanges.bucket2+1}+ days): ${buckets.bucket3.length} incidents`);
  
  return buckets;
}

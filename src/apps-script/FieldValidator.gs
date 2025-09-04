/**
 * Field Validation Module
 * Validates required fields across different platforms
 */

/**
 * Validate required fields for all incidents
 */
function validateRequiredFields(incidents) {
  console.log(`🔍 Validating required fields for ${incidents.length} incidents...`);
  
  const incidentsWithMissingFields = [];
  
  incidents.forEach(incident => {
    const missingFields = [];
    
    // Check each required field
    REQUIRED_FIELDS.forEach(fieldName => {
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
 * Check if incident has a required field populated
 */
function hasRequiredField(incident, fieldName) {
  let fieldValue = '';
  
  if (incident.platform === 'incident.io') {
    // Handle incident.io field mapping
    fieldValue = getIncidentIOFieldValue(incident, fieldName);
  } else if (incident.platform === 'firehydrant') {
    // Handle FireHydrant field mapping
    fieldValue = getFireHydrantFieldValue(incident, fieldName);
  }
  
  // Consider field missing if it's empty, null, undefined, or whitespace-only
  return fieldValue && fieldValue.trim().length > 0;
}

/**
 * Get field value from incident.io incident with field name mapping
 */
function getIncidentIOFieldValue(incident, fieldName) {
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
 * Get field value from FireHydrant incident with field name mapping
 */
function getFireHydrantFieldValue(incident, fieldName) {
  // Map required field names to FireHydrant label keys
  const fieldMapping = {
    'Affected Markets': ['affected_markets', 'markets_affected', 'impacted_markets'],
    'Causal Type': ['causal_type', 'root_cause_type'],
    'Stabilization Type': ['stabilization_type', 'resolution_type']
  };
  
  const possibleFieldNames = fieldMapping[fieldName] || [fieldName.toLowerCase().replace(/\s+/g, '_')];
  
  // Try each possible field name
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
  
  // 1. INCLUDE ONLY specific statuses (finalized decision)
  filteredIncidents = filteredIncidents.filter(incident => {
    const status = incident.incident_status?.name || incident.status || '';
    const isIncluded = INCIDENT_FILTERING.includeStatuses.includes(status);
    return isIncluded;
  });
  console.log(`   📊 After status inclusion filter (${INCIDENT_FILTERING.includeStatuses.join(', ')}): ${filteredIncidents.length} incidents`);
  
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

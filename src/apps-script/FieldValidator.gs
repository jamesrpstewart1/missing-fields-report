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
 * Filter incidents based on configuration criteria
 */
function filterIncidentsByCriteria(incidents, config) {
  console.log(`🔍 Filtering ${incidents.length} incidents by criteria...`);
  
  let filteredIncidents = incidents;
  
  // Filter by status if specified
  if (config.includeStatuses && config.includeStatuses.length > 0) {
    filteredIncidents = filteredIncidents.filter(incident => {
      const status = incident.incident_status?.name || incident.status || '';
      return config.includeStatuses.includes(status);
    });
    console.log(`   📊 After status filter: ${filteredIncidents.length} incidents`);
  }
  
  // Filter by cutoff date if specified
  if (config.cutoffDate) {
    const cutoffDate = new Date(config.cutoffDate);
    filteredIncidents = filteredIncidents.filter(incident => {
      const createdAt = new Date(incident.created_at);
      return createdAt >= cutoffDate;
    });
    console.log(`   📊 After cutoff date filter: ${filteredIncidents.length} incidents`);
  }
  
  // Exclude certain incident types
  const excludedTypes = ['[TEST]', '[Preemptive SEV]'];
  filteredIncidents = filteredIncidents.filter(incident => {
    const type = incident.incident_type?.name || incident.type || '';
    return !excludedTypes.some(excludedType => type.includes(excludedType));
  });
  console.log(`   📊 After type exclusion filter: ${filteredIncidents.length} incidents`);
  
  // Exclude certain statuses
  const excludedStatuses = ['Declined', 'Canceled', 'Cancelled', 'Triage', 'Merged'];
  filteredIncidents = filteredIncidents.filter(incident => {
    const status = incident.incident_status?.name || incident.status || '';
    return !excludedStatuses.includes(status);
  });
  console.log(`   📊 After status exclusion filter: ${filteredIncidents.length} incidents`);
  
  console.log(`✅ Final filtered incidents: ${filteredIncidents.length}`);
  return filteredIncidents;
}

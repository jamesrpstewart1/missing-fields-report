/**
 * API Integration Module
 * Handles all API calls to incident.io and FireHydrant
 */

/**
 * Fetch incidents from incident.io (Square/Cash)
 */
function fetchIncidentsFromIncidentIO(businessUnit, config) {
  console.log(`📡 Fetching incidents from incident.io (${businessUnit})...`);
  
  const apiConfig = CONFIG.incidentio[businessUnit];
  if (!apiConfig || !apiConfig.apiKey) {
    throw new Error(`Missing API configuration for incident.io ${businessUnit}`);
  }
  
  const incidents = [];
  let hasMore = true;
  let after = null;
  let pageCount = 0;
  const maxPages = 20; // Safety limit
  
  // Calculate date range based on configuration from Google Sheets
  const endDate = new Date();
  const startDate = new Date();
  const maxLookbackDays = config.maxLookbackDays || INCIDENT_FILTERING.dateRanges.maxLookback;
  startDate.setDate(startDate.getDate() - maxLookbackDays);
  
  console.log(`   📅 Using lookback period: ${maxLookbackDays} days (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
  
  // Check if severity filtering is enabled
  const severityFilteringEnabled = config.enableSeverityFiltering || false;
  const allowedSeverities = config.incidentioSeverities || ['SEV0', 'SEV1', 'SEV2', 'SEV3', 'SEV4'];
  const includeInternalImpact = config.includeInternalImpact !== false; // Default to true
  
  if (severityFilteringEnabled) {
    console.log(`   🔍 Severity filtering enabled - Including: ${allowedSeverities.join(', ')}`);
    console.log(`   🔍 Include internal impact variants: ${includeInternalImpact}`);
  }
  
  const apiStartDateStr = formatDate(startDate);
  const apiEndDateStr = formatDate(endDate);
  
  while (hasMore && pageCount < maxPages) {
    // Use finalized incident modes from INCIDENT_FILTERING
    let url = `${apiConfig.baseUrl}/incidents?created_at[date_range]=${apiStartDateStr}~${apiEndDateStr}&page_size=250`;
    INCIDENT_FILTERING.includeModes.forEach(mode => {
      url += `&mode[one_of]=${mode}`;
    });
    
    if (after) {
      url += `&after=${after}`;
    }
    
    console.log(`     📡 Fetching page ${pageCount + 1} for ${businessUnit}`);
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`${businessUnit} API call failed: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      
      if (!data.incidents || data.incidents.length === 0) {
        console.log(`     ⏹️ No more incidents found for ${businessUnit}`);
        break;
      }
      
      // Add platform and business unit info to each incident
      let enrichedIncidents = data.incidents.map(incident => ({
        ...incident,
        platform: 'incident.io',
        businessUnit: capitalizeBusinessUnit(businessUnit),
        url: incident.permalink || `https://app.incident.io/incidents/${incident.id}`,
        slackUrl: getIncidentIOSlackUrl(incident)
      }));
      
      // Apply severity filtering if enabled
      if (severityFilteringEnabled) {
        const beforeFilterCount = enrichedIncidents.length;
        enrichedIncidents = enrichedIncidents.filter(incident => 
          matchesIncidentIOSeverity(incident, allowedSeverities, includeInternalImpact)
        );
        const afterFilterCount = enrichedIncidents.length;
        console.log(`     🔍 Severity filter: ${beforeFilterCount} → ${afterFilterCount} incidents`);
      }
      
      incidents.push(...enrichedIncidents);
      pageCount++;
      
      // Check for pagination
      if (data.pagination_meta && data.pagination_meta.after) {
        after = data.pagination_meta.after;
        hasMore = true;
      } else {
        hasMore = false;
      }
      
      // Rate limit protection
      if (hasMore) {
        Utilities.sleep(200);
      }
      
    } catch (error) {
      console.error(`❌ Error fetching from ${businessUnit}:`, error.toString());
      throw error;
    }
  }
  
  console.log(`     ✅ Fetched ${incidents.length} incidents from ${businessUnit}`);
  return incidents;
}

/**
 * Fetch incidents from FireHydrant (Afterpay)
 */
function fetchIncidentsFromFireHydrant(businessUnit, config) {
  console.log(`📡 Fetching incidents from FireHydrant (${businessUnit})...`);
  
  const apiConfig = CONFIG.firehydrant[businessUnit];
  if (!apiConfig || !apiConfig.apiKey) {
    throw new Error(`Missing API configuration for FireHydrant ${businessUnit}`);
  }
  
  const incidents = [];
  let page = 1;
  const maxPages = 20; // Safety limit
  
  // Calculate date range based on configuration from Google Sheets
  const endDate = new Date();
  const startDate = new Date();
  const maxLookbackDays = config.maxLookbackDays || INCIDENT_FILTERING.dateRanges.maxLookback;
  startDate.setDate(startDate.getDate() - maxLookbackDays);
  
  console.log(`   📅 Using lookback period: ${maxLookbackDays} days (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
  
  // Check if severity filtering is enabled
  const severityFilteringEnabled = config.enableSeverityFiltering || false;
  const allowedSeverities = config.firehydrantSeverities || ['SEV0', 'SEV1', 'SEV2', 'SEV3', 'SEV4'];
  
  if (severityFilteringEnabled) {
    console.log(`   🔍 Severity filtering enabled - Including: ${allowedSeverities.join(', ')}`);
  }
  
  while (page <= maxPages) {
    const url = `${apiConfig.baseUrl}/incidents?page=${page}&per_page=100`;
    
    console.log(`     📡 Fetching page ${page} for ${businessUnit}`);
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`${businessUnit} API call failed: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      
      if (!data.data || data.data.length === 0) {
        console.log(`     ⏹️ No more incidents found for ${businessUnit}`);
        break;
      }
      
      // Filter by date range and add platform info
      let filteredIncidents = data.data
        .filter(incident => {
          const createdAt = new Date(incident.created_at);
          return createdAt >= startDate && createdAt <= endDate;
        })
        .map(incident => ({
          ...incident,
          platform: 'firehydrant',
          businessUnit: capitalizeBusinessUnit(businessUnit),
          reference: getFireHydrantReference(incident),
          url: incident.incident_url || `https://app.firehydrant.io/incidents/${incident.id}`,
          slackUrl: getFireHydrantSlackUrl(incident)
        }));
      
      // Apply severity filtering if enabled
      if (severityFilteringEnabled) {
        const beforeFilterCount = filteredIncidents.length;
        filteredIncidents = filteredIncidents.filter(incident => 
          matchesFireHydrantSeverity(incident, allowedSeverities)
        );
        const afterFilterCount = filteredIncidents.length;
        console.log(`     🔍 Severity filter: ${beforeFilterCount} → ${afterFilterCount} incidents`);
      }
      
      incidents.push(...filteredIncidents);
      page++;
      
      // If we got less than the page size, we're done
      if (data.data.length < 100) {
        break;
      }
      
      // Rate limit protection
      Utilities.sleep(200);
      
    } catch (error) {
      console.error(`❌ Error fetching from ${businessUnit}:`, error.toString());
      throw error;
    }
  }
  
  console.log(`     ✅ Fetched ${incidents.length} incidents from ${businessUnit}`);
  return incidents;
}

/**
 * Get custom field value from incident.io incident
 */
function getCustomFieldValue(incident, fieldName) {
  if (!incident.custom_field_entries) {
    return [];
  }
  
  const entry = incident.custom_field_entries.find(
    entry => entry.custom_field.name === fieldName
  );
  
  if (!entry || !entry.values || entry.values.length === 0) {
    return [''];
  }
  
  return entry.values.map(value => 
    value.value_option?.value ||
    value.value_catalog_entry?.name ||
    value.value_text ||
    value.value_link ||
    value.value_numeric ||
    ''
  ).filter(v => v !== null && v !== undefined && v !== '');
}

/**
 * Get field value from FireHydrant incident
 */
function getFireHydrantFieldValue(incident, fieldName) {
  // FireHydrant uses custom_fields for custom data
  if (!incident.custom_fields || typeof incident.custom_fields !== 'object') {
    return [''];
  }
  
  const customField = incident.custom_fields[fieldName];
  if (customField && customField.value) {
    return [customField.value];
  }
  
  return [''];
}

/**
 * Get FireHydrant incident reference in format #1721
 */
function getFireHydrantReference(incident) {
  // FireHydrant uses 'number' field for human-readable incident numbers (e.g., 1721)
  // The 'id' field is a UUID which we don't want to display
  if (incident.number) {
    return `#${incident.number}`;
  } else if (incident.incident_number) {
    return `#${incident.incident_number}`;
  } else if (incident.display_id) {
    return `#${incident.display_id}`;
  }
  
  // Fallback - use a short version of the UUID if no human-readable number exists
  if (incident.id) {
    const shortId = incident.id.split('-')[0]; // Use first part of UUID
    return `FH-${shortId}`;
  }
  
  return 'FH-Unknown';
}

/**
 * Capitalize business unit names for display
 */
function capitalizeBusinessUnit(businessUnit) {
  const mapping = {
    'square': 'Square',
    'cash': 'Cash',
    'afterpay': 'Afterpay'
  };
  
  return mapping[businessUnit.toLowerCase()] || businessUnit.charAt(0).toUpperCase() + businessUnit.slice(1).toLowerCase();
}

/**
 * Get Slack URL for incident.io incident
 */
function getIncidentIOSlackUrl(incident) {
  // incident.io provides slack_channel_id and slack_team_id
  if (incident.slack_channel_id && incident.slack_team_id) {
    return `https://app.slack.com/client/${incident.slack_team_id}/${incident.slack_channel_id}`;
  } else if (incident.slack_channel_id) {
    // Fallback without team ID
    return `https://slack.com/app_redirect?channel=${incident.slack_channel_id}`;
  }
  
  return null; // No Slack link available
}

/**
 * Get Slack URL for FireHydrant incident  
 */
function getFireHydrantSlackUrl(incident) {
  // FireHydrant might have incident_channels with Slack URLs
  // Based on the debug output, we need to check if there are channels
  // The debug was truncated, but we can try common field patterns
  
  // Try common FireHydrant Slack field patterns
  if (incident.slack_channel_url) {
    return incident.slack_channel_url;
  } else if (incident.channel_url) {
    return incident.channel_url;
  } else if (incident.incident_channels && incident.incident_channels.length > 0) {
    // Look for Slack channel in incident_channels array
    const slackChannel = incident.incident_channels.find(channel => 
      channel.source === 'slack' || channel.type === 'slack'
    );
    if (slackChannel && slackChannel.url) {
      return slackChannel.url;
    }
  }
  
  return null; // No Slack link available
}

/**
 * Debug function to log incident fields (helps find new field names)
 */
function debugIncidentFields() {
  console.log('🔍 Debug: Fetching sample incidents to find new field names...');
  
  try {
    const config = getConfiguration();
    
    // Get a few sample incidents from incident.io to examine field structure
    console.log('--- incident.io Sample for New Fields Research ---');
    const squareIncidents = fetchIncidentsFromIncidentIO('square', config);
    if (squareIncidents.length > 0) {
      const incident = squareIncidents[0];
      console.log('Sample incident.io incident fields:');
      console.log('ID:', incident.id);
      console.log('Reference:', incident.reference);
      console.log('Created At:', incident.created_at);
      
      // Look for Impact Start Date and Time fields
      console.log('\n🔍 Searching for Impact Start Date fields:');
      console.log('impact_start_date:', incident.impact_start_date);
      console.log('impact_started_at:', incident.impact_started_at);
      console.log('started_at:', incident.started_at);
      console.log('impact_override:', incident.impact_override);
      
      // Look for Incident Transcript URL fields
      console.log('\n🔍 Searching for Incident Transcript URL fields:');
      console.log('transcript_url:', incident.transcript_url);
      console.log('incident_transcript_url:', incident.incident_transcript_url);
      console.log('postmortem_document_url:', incident.postmortem_document_url);
      console.log('call_url:', incident.call_url);
      console.log('meeting_url:', incident.meeting_url);
      
      // Check custom fields for these values too
      console.log('\n🔍 Checking custom fields:');
      if (incident.custom_field_entries) {
        incident.custom_field_entries.forEach(entry => {
          const fieldName = entry.custom_field?.name || '';
          if (fieldName.toLowerCase().includes('impact') && fieldName.toLowerCase().includes('start') ||
              fieldName.toLowerCase().includes('transcript') ||
              fieldName.toLowerCase().includes('call') ||
              fieldName.toLowerCase().includes('meeting')) {
            console.log(`Custom field "${fieldName}":`, entry.values);
          }
        });
      }
      
      // Show full structure for manual inspection (truncated)
      console.log('\n📋 Full incident structure (first 20 keys):');
      const keys = Object.keys(incident).slice(0, 20);
      keys.forEach(key => {
        console.log(`${key}:`, typeof incident[key], incident[key] ? 'HAS_VALUE' : 'NULL/EMPTY');
      });
    }
    
  } catch (error) {
    console.error('Debug failed:', error.toString());
  }
}

/**
 * Research specific field names for new requirements
 */
function researchNewFieldNames() {
  console.log('🔬 Researching new field names for Phase 1 requirements...');
  
  try {
    const config = getConfiguration();
    
    // Fetch recent incidents from both Square and Cash
    console.log('--- Researching Square incidents ---');
    const squareIncidents = fetchIncidentsFromIncidentIO('square', config);
    
    console.log('--- Researching Cash incidents ---');
    const cashIncidents = fetchIncidentsFromIncidentIO('cash', config);
    
    const allIncidents = [...squareIncidents, ...cashIncidents];
    console.log(`\n📊 Total incidents to analyze: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found to analyze');
      return;
    }
    
    // Analyze field patterns
    const fieldAnalysis = {
      impactStartFields: new Set(),
      transcriptFields: new Set(),
      customFieldNames: new Set(),
      timestampFields: new Set()
    };
    
    allIncidents.slice(0, 10).forEach((incident, index) => {
      console.log(`\n🔍 Analyzing incident ${index + 1}: ${incident.reference}`);
      
      // Check all top-level fields for impact start patterns
      Object.keys(incident).forEach(key => {
        if (key.toLowerCase().includes('impact') || key.toLowerCase().includes('start')) {
          fieldAnalysis.impactStartFields.add(`${key}: ${typeof incident[key]}`);
          if (incident[key]) {
            console.log(`   📅 Found impact/start field: ${key} = ${incident[key]}`);
          }
        }
        
        if (key.toLowerCase().includes('transcript') || key.toLowerCase().includes('call') || key.toLowerCase().includes('meeting')) {
          fieldAnalysis.transcriptFields.add(`${key}: ${typeof incident[key]}`);
          if (incident[key]) {
            console.log(`   📋 Found transcript/call field: ${key} = ${incident[key]}`);
          }
        }
        
        // Look for timestamp-related fields
        if (key.toLowerCase().includes('timestamp') || key.toLowerCase().includes('time')) {
          fieldAnalysis.timestampFields.add(`${key}: ${typeof incident[key]}`);
          if (incident[key]) {
            console.log(`   ⏰ Found timestamp field: ${key} = ${JSON.stringify(incident[key])}`);
          }
        }
      });
      
      // Check custom fields
      if (incident.custom_field_entries) {
        incident.custom_field_entries.forEach(entry => {
          const fieldName = entry.custom_field?.name || '';
          fieldAnalysis.customFieldNames.add(fieldName);
          
          if ((fieldName.toLowerCase().includes('impact') && fieldName.toLowerCase().includes('start')) ||
              fieldName.toLowerCase().includes('transcript')) {
            console.log(`   🎯 Relevant custom field: "${fieldName}" = ${JSON.stringify(entry.values)}`);
          }
        });
      }
    });
    
    // Summary
    console.log('\n📊 FIELD ANALYSIS SUMMARY:');
    console.log('\n🔍 Impact Start Date candidates:');
    fieldAnalysis.impactStartFields.forEach(field => console.log(`   - ${field}`));
    
    console.log('\n🔍 Transcript URL candidates:');
    fieldAnalysis.transcriptFields.forEach(field => console.log(`   - ${field}`));
    
    console.log('\n⏰ Timestamp fields found:');
    fieldAnalysis.timestampFields.forEach(field => console.log(`   - ${field}`));
    
    console.log('\n🔍 All custom field names found:');
    Array.from(fieldAnalysis.customFieldNames).sort().forEach(name => {
      if (name) console.log(`   - "${name}"`);
    });
    
  } catch (error) {
    console.error('❌ Research failed:', error.toString());
    throw error;
  }
}

/**
 * Deep research function specifically for Impact Start timestamp using V2 endpoint
 */
function researchImpactStartTimestamp() {
  console.log('🔬 Deep research for Impact Start timestamp using V2 endpoint...');
  
  try {
    const config = getConfiguration();
    const apiConfig = CONFIG.incidentio.square;
    
    // Fetch sample incidents first
    const squareIncidents = fetchIncidentsFromIncidentIO('square', config);
    
    if (squareIncidents.length === 0) {
      console.log('❌ No incidents found for analysis');
      return;
    }
    
    console.log(`\n🔍 Researching incident timestamps for ${Math.min(3, squareIncidents.length)} incidents:`);
    
    // Research timestamps for first 3 incidents using V2 endpoint
    for (let i = 0; i < Math.min(3, squareIncidents.length); i++) {
      const incident = squareIncidents[i];
      console.log(`\n📋 Incident ${i + 1}: ${incident.reference} (ID: ${incident.id})`);
      
      try {
        // Call the incident timestamps V2 endpoint
        const timestampsUrl = `${apiConfig.baseUrl}/incident_timestamps?incident_id=${incident.id}`;
        console.log(`   📡 Fetching timestamps from: ${timestampsUrl}`);
        
        const response = UrlFetchApp.fetch(timestampsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.getResponseCode() === 200) {
          const timestampsData = JSON.parse(response.getContentText());
          console.log(`   ✅ Timestamps response:`, JSON.stringify(timestampsData, null, 2));
          
          // Look for impact-related timestamps
          if (timestampsData.incident_timestamps) {
            console.log(`   ⏰ Found ${timestampsData.incident_timestamps.length} timestamps:`);
            timestampsData.incident_timestamps.forEach((timestamp, index) => {
              const name = timestamp.name || 'Unknown';
              const value = timestamp.value || 'NULL';
              const id = timestamp.id || 'Unknown';
              console.log(`     ${index + 1}. "${name}": ${value} (ID: ${id})`);
              
              // Highlight impact-related timestamps
              if (name.toLowerCase().includes('impact') || name.toLowerCase().includes('start')) {
                console.log(`       🎯 POTENTIAL MATCH: "${name}" = ${value}`);
              }
            });
          } else {
            console.log(`   ❌ No incident_timestamps in response`);
          }
          
        } else {
          console.log(`   ❌ Timestamps API call failed: ${response.getResponseCode()} - ${response.getContentText()}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error fetching timestamps for ${incident.reference}:`, error.toString());
      }
      
      // Rate limiting
      Utilities.sleep(500);
    }
    
    // Show results in UI
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🔬 Incident Timestamps V2 Research Complete',
      'Research using the dedicated timestamps endpoint complete. Check the Apps Script logs for detailed timestamp field names.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Incident timestamps research failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Research Failed',
      `Incident timestamps research failed:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Research function to explore severity field structures for filtering
 */
function researchSeverityFields() {
  console.log('🔬 Researching severity field structures for filtering...');
  
  try {
    const config = getConfiguration();
    
    // Research incident.io severity structure
    console.log('\n--- incident.io Severity Research (Square) ---');
    const squareIncidents = fetchIncidentsFromIncidentIO('square', config);
    
    if (squareIncidents.length > 0) {
      console.log(`\n📊 Analyzing severity fields in ${Math.min(5, squareIncidents.length)} incidents:`);
      
      const severityData = new Set();
      const impactData = new Set();
      
      squareIncidents.slice(0, 5).forEach((incident, index) => {
        console.log(`\n🔍 Incident ${index + 1}: ${incident.reference}`);
        
        // Check severity field
        if (incident.severity) {
          const severityInfo = `${incident.severity.name || 'Unknown'} (ID: ${incident.severity.id || 'Unknown'})`;
          severityData.add(severityInfo);
          console.log(`   📊 Severity: ${severityInfo}`);
        }
        
        // Check impact field  
        if (incident.impact) {
          const impactInfo = `${incident.impact.name || 'Unknown'} (ID: ${incident.impact.id || 'Unknown'})`;
          impactData.add(impactInfo);
          console.log(`   💥 Impact: ${impactInfo}`);
        }
        
        // Look for other severity-related fields
        Object.keys(incident).forEach(key => {
          if (key.toLowerCase().includes('sev') || key.toLowerCase().includes('priority')) {
            console.log(`   🔍 Found ${key}:`, incident[key]);
          }
        });
      });
      
      console.log('\n📋 Summary of Severity Values Found:');
      severityData.forEach(severity => console.log(`   - ${severity}`));
      
      console.log('\n📋 Summary of Impact Values Found:');
      impactData.forEach(impact => console.log(`   - ${impact}`));
    }
    
    // Research FireHydrant severity structure
    console.log('\n--- FireHydrant Severity Research (Afterpay) ---');
    const afterpayIncidents = fetchIncidentsFromFireHydrant('afterpay', config);
    
    if (afterpayIncidents.length > 0) {
      console.log(`\n📊 Analyzing severity fields in ${Math.min(5, afterpayIncidents.length)} incidents:`);
      
      const fhSeverityData = new Set();
      const fhPriorityData = new Set();
      
      afterpayIncidents.slice(0, 5).forEach((incident, index) => {
        console.log(`\n🔍 Incident ${index + 1}: ${incident.reference}`);
        
        // Check common FireHydrant severity fields
        if (incident.severity) {
          const severityInfo = JSON.stringify(incident.severity);
          fhSeverityData.add(severityInfo);
          console.log(`   📊 Severity: ${severityInfo}`);
        }
        
        if (incident.priority) {
          const priorityInfo = JSON.stringify(incident.priority);
          fhPriorityData.add(priorityInfo);
          console.log(`   ⚡ Priority: ${priorityInfo}`);
        }
        
        // Look for other severity-related fields
        Object.keys(incident).forEach(key => {
          if (key.toLowerCase().includes('sev') || key.toLowerCase().includes('priority') || key.toLowerCase().includes('impact')) {
            console.log(`   🔍 Found ${key}:`, incident[key]);
          }
        });
      });
      
      console.log('\n📋 Summary of FireHydrant Severity Values:');
      fhSeverityData.forEach(severity => console.log(`   - ${severity}`));
      
      console.log('\n📋 Summary of FireHydrant Priority Values:');
      fhPriorityData.forEach(priority => console.log(`   - ${priority}`));
    }
    
    // Show results in UI
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🔬 Severity Fields Research Complete',
      'Research of severity field structures complete. Check the Apps Script logs for detailed field information and available severity values.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Severity research failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Research Failed',
      `Severity research failed:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Research function to explore all available timestamp types
 */
function researchTimestampTypes() {
  console.log('🔬 Researching all available incident timestamp types...');
  
  try {
    const apiConfig = CONFIG.incidentio.square;
    
    // Call the incident timestamp types endpoint to see all available types
    const typesUrl = `${apiConfig.baseUrl}/incident_timestamp_types`;
    console.log(`📡 Fetching timestamp types from: ${typesUrl}`);
    
    const response = UrlFetchApp.fetch(typesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.getResponseCode() === 200) {
      const typesData = JSON.parse(response.getContentText());
      console.log(`✅ Timestamp types response:`, JSON.stringify(typesData, null, 2));
      
      if (typesData.incident_timestamp_types) {
        console.log(`\n📋 Available timestamp types (${typesData.incident_timestamp_types.length}):`);
        typesData.incident_timestamp_types.forEach((type, index) => {
          const name = type.name || 'Unknown';
          const id = type.id || 'Unknown';
          console.log(`   ${index + 1}. "${name}" (ID: ${id})`);
          
          // Highlight impact-related types
          if (name.toLowerCase().includes('impact') || name.toLowerCase().includes('start')) {
            console.log(`     🎯 POTENTIAL IMPACT START: "${name}"`);
          }
        });
      }
      
    } else {
      console.log(`❌ Timestamp types API call failed: ${response.getResponseCode()} - ${response.getContentText()}`);
    }
    
    // Show results in UI
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🔬 Timestamp Types Research Complete',
      'Research of all available timestamp types complete. Check the Apps Script logs for the full list.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Timestamp types research failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Research Failed',
      `Timestamp types research failed:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Check if incident.io incident matches severity filter
 */
function matchesIncidentIOSeverity(incident, allowedSeverities, includeInternalImpact) {
  if (!incident.severity || !incident.severity.name) {
    return false; // No severity data, exclude
  }
  
  const severityName = incident.severity.name;
  
  // Check for direct severity match
  if (allowedSeverities.includes(severityName)) {
    return true;
  }
  
  // Check for internal impact variants if enabled
  if (includeInternalImpact) {
    // Look for patterns like "SEV1 (Internal Impact)" or "SEV2 - Internal Impact"
    const baseSeverity = severityName.match(/^(SEV\d+)/i);
    if (baseSeverity && allowedSeverities.includes(baseSeverity[1].toUpperCase())) {
      const isInternalImpact = severityName.toLowerCase().includes('internal');
      if (isInternalImpact) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if FireHydrant incident matches severity filter
 */
function matchesFireHydrantSeverity(incident, allowedSeverities) {
  if (!incident.severity) {
    return false; // No severity data, exclude
  }
  
  // FireHydrant severity might be a string or object
  let severityName = '';
  if (typeof incident.severity === 'string') {
    severityName = incident.severity;
  } else if (incident.severity.name) {
    severityName = incident.severity.name;
  } else if (incident.severity.value) {
    severityName = incident.severity.value;
  }
  
  // Check if severity matches allowed list
  return allowedSeverities.includes(severityName);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

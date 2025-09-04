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
  
  // Calculate date range based on finalized configuration (90+ days to capture all buckets)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - INCIDENT_FILTERING.dateRanges.bucket3);
  
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
      const enrichedIncidents = data.incidents.map(incident => ({
        ...incident,
        platform: 'incident.io',
        businessUnit: businessUnit,
        url: incident.permalink || `https://app.incident.io/incidents/${incident.id}`
      }));
      
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
  
  // Calculate date range based on finalized configuration (90+ days to capture all buckets)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - INCIDENT_FILTERING.dateRanges.bucket3);
  
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
      const filteredIncidents = data.data
        .filter(incident => {
          const createdAt = new Date(incident.created_at);
          return createdAt >= startDate && createdAt <= endDate;
        })
        .map(incident => ({
          ...incident,
          platform: 'firehydrant',
          businessUnit: businessUnit,
          url: incident.incident_url || `https://app.firehydrant.io/incidents/${incident.id}`
        }));
      
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
  // FireHydrant uses labels for custom fields
  if (!incident.labels) {
    return [];
  }
  
  const label = incident.labels.find(label => label.key === fieldName);
  return label ? [label.value] : [''];
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

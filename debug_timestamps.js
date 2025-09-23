/**
 * Debug script to test timestamp retrieval for INC-6071
 * This should be run in Google Apps Script to debug the timestamp issue
 */

function testTimestampDebug() {
  console.log('🔍 Testing timestamp debug for INC-6071...');
  
  // Test the debug function
  const timestampData = debugIncidentTimestamps('INC-6071', 'square');
  
  console.log('📊 Timestamp debug results:', JSON.stringify(timestampData, null, 2));
  
  // Also test the actual functions
  const mockIncident = {
    id: 'INC-6071',
    businessUnit: 'Square',
    platform: 'incident.io'
  };
  
  console.log('🔍 Testing getImpactStartTimestamp...');
  const impactStart = getImpactStartTimestamp(mockIncident);
  console.log('Impact Start result:', impactStart);
  
  console.log('🔍 Testing getTimeToStabilizeTimestamp...');
  const timeToStabilize = getTimeToStabilizeTimestamp(mockIncident);
  console.log('Time to Stabilize result:', timeToStabilize);
}

function debugSingleIncident() {
  console.log('🔍 Debugging single incident INC-6071...');
  
  // Create a mock incident object similar to what the real code would have
  const incident = {
    id: 'INC-6071',
    businessUnit: 'Square',
    platform: 'incident.io'
  };
  
  // Test field validation
  console.log('Testing Impact Start Date field...');
  const hasImpactStart = hasRequiredField(incident, 'Impact Start Date');
  console.log('Has Impact Start Date:', hasImpactStart);
  
  console.log('Testing Time to Stabilize field...');
  const hasTimeToStabilize = hasRequiredField(incident, 'Time to Stabilize');
  console.log('Has Time to Stabilize:', hasTimeToStabilize);
  
  // Get the actual values
  const impactStartValue = getIncidentIOFieldValue(incident, 'Impact Start Date');
  console.log('Impact Start Date value:', impactStartValue);
  
  const timeToStabilizeValue = getIncidentIOFieldValue(incident, 'Time to Stabilize');
  console.log('Time to Stabilize value:', timeToStabilizeValue);
}

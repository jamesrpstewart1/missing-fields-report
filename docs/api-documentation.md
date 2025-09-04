# API Integration Documentation

## Overview
This document outlines the API integrations for incident.io and FireHydrant platforms, including authentication, endpoints, data structures, and implementation patterns.

## incident.io API Integration

### Authentication
- **Method**: [TO BE DOCUMENTED - from existing PPE Monthly Report]
- **Credentials Storage**: Google Apps Script Properties Service
- **Token Management**: [TO BE DOCUMENTED]

### Endpoints
- **Base URL**: `https://api.incident.io/v1/`
- **Incidents Endpoint**: `/incidents`
- **Business Units**: Square, Cash

### Data Structure
```json
{
  "incident": {
    "id": "string",
    "title": "string",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime",
    "custom_fields": {
      "affected_markets": "string",
      "causal_type": "string", 
      "stabilization_type": "string"
    },
    "business_unit": "string"
  }
}
```

### Rate Limits
- **Limit**: [TO BE DOCUMENTED]
- **Reset Window**: [TO BE DOCUMENTED]
- **Headers**: [TO BE DOCUMENTED]

### Error Handling
- **HTTP Status Codes**: [TO BE DOCUMENTED]
- **Error Response Format**: [TO BE DOCUMENTED]
- **Retry Logic**: [TO BE IMPLEMENTED]

## FireHydrant API Integration

### Authentication
- **Method**: [TO BE CONFIGURED]
- **Credentials Storage**: Google Apps Script Properties Service
- **Token Management**: [TO BE IMPLEMENTED]

### Endpoints
- **Base URL**: `https://api.firehydrant.io/v1/`
- **Incidents Endpoint**: `/incidents`
- **Business Unit**: Afterpay

### Data Structure
```json
{
  "incident": {
    "id": "string",
    "name": "string",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime",
    "labels": {
      "affected_markets": "string",
      "causal_type": "string",
      "stabilization_type": "string"
    },
    "team": "string"
  }
}
```

### Rate Limits
- **Limit**: [TO BE DOCUMENTED]
- **Reset Window**: [TO BE DOCUMENTED]
- **Headers**: [TO BE DOCUMENTED]

### Error Handling
- **HTTP Status Codes**: [TO BE DOCUMENTED]
- **Error Response Format**: [TO BE DOCUMENTED]
- **Retry Logic**: [TO BE IMPLEMENTED]

## Field Mapping

### Required Fields Mapping
| Field Name | incident.io | FireHydrant | Notes |
|------------|-------------|-------------|-------|
| Affected Markets | `custom_fields.affected_markets` | `labels.affected_markets` | Also referred to as "Impacted Market" |
| Causal Type | `custom_fields.causal_type` | `labels.causal_type` | Root cause classification |
| Stabilization Type | `custom_fields.stabilization_type` | `labels.stabilization_type` | Resolution method |

### Business Unit Mapping
| Platform | Business Units | API Filter |
|----------|----------------|------------|
| incident.io | Square, Cash | [TO BE DOCUMENTED] |
| FireHydrant | Afterpay | [TO BE DOCUMENTED] |

## Implementation Patterns

### API Client Structure
```javascript
class IncidentAPIClient {
  constructor(platform, credentials) {
    this.platform = platform;
    this.credentials = credentials;
    this.baseUrl = this.getBaseUrl();
  }
  
  getIncidents(filters) {
    // Implementation
  }
  
  validateFields(incident) {
    // Implementation
  }
}
```

### Error Handling Pattern
```javascript
function makeAPICall(url, options, retries = 3) {
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 429) {
      // Rate limit handling
      return this.handleRateLimit(url, options, retries);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      Utilities.sleep(1000 * (4 - retries)); // Exponential backoff
      return makeAPICall(url, options, retries - 1);
    }
    throw error;
  }
}
```

### Data Processing Pattern
```javascript
function processIncidents(incidents) {
  return incidents.map(incident => {
    return {
      id: incident.id,
      title: incident.title || incident.name,
      platform: this.platform,
      businessUnit: this.getBusinessUnit(incident),
      missingFields: this.validateRequiredFields(incident),
      url: this.getIncidentUrl(incident.id)
    };
  });
}
```

## Configuration

### API Credentials Configuration
```javascript
// Store in Google Apps Script Properties
const properties = PropertiesService.getScriptProperties();
properties.setProperties({
  'INCIDENT_IO_API_KEY': 'your-api-key',
  'FIREHYDRANT_API_KEY': 'your-api-key'
});
```

### Request Headers
```javascript
const headers = {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'User-Agent': 'Missing-Fields-Report/1.0'
};
```

## Testing

### API Testing Checklist
- [ ] Authentication successful
- [ ] Incident retrieval working
- [ ] Field mapping correct
- [ ] Rate limit handling
- [ ] Error handling
- [ ] Business unit filtering
- [ ] Data validation

### Test Data
```javascript
const testIncidents = [
  {
    id: 'test-1',
    title: 'Test Incident with Missing Fields',
    custom_fields: {
      affected_markets: null,
      causal_type: 'Human Error',
      stabilization_type: null
    }
  }
];
```

## Monitoring and Logging

### API Metrics to Track
- Response times
- Success/failure rates
- Rate limit hits
- Error types and frequencies

### Logging Format
```javascript
function logAPICall(platform, endpoint, status, duration) {
  console.log(`API_CALL: ${platform} ${endpoint} ${status} ${duration}ms`);
}
```

## Security Considerations

### Credential Management
- Store API keys in Google Apps Script Properties Service
- Never log or expose credentials in code
- Rotate credentials regularly

### Data Privacy
- Minimize data retention
- Sanitize sensitive information in logs
- Comply with incident data handling policies

## Future Enhancements

### Potential Improvements
- [ ] Webhook integration for real-time updates
- [ ] GraphQL support for more efficient queries
- [ ] Caching layer for improved performance
- [ ] Advanced filtering and search capabilities
- [ ] Bulk operations support

## References
- [incident.io API Documentation](https://incident.io/docs/api)
- [FireHydrant API Documentation](https://firehydrant.com/docs/api)
- [Google Apps Script UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch)

// =============================================================================
// DEBUG FUNCTIONS FOR CONFIGURATION ISSUES
// =============================================================================

/**
 * Debug configuration parsing issues
 * This function will help identify why includeInternalImpact is showing as true when Config sheet shows FALSE
 */
function debugConfigurationParsing() {
  console.log('🔍 DEBUGGING CONFIGURATION PARSING');
  console.log('=====================================');
  
  try {
    // Step 1: Check if Config sheet exists and read raw data
    console.log('📋 Step 1: Reading Config sheet raw data...');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
    
    if (!sheet) {
      console.log('❌ Config sheet not found!');
      const ui = SpreadsheetApp.getUi();
      ui.alert('❌ Config sheet not found', 'Cannot debug configuration without Config sheet.', ui.ButtonSet.OK);
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    console.log(`   Found ${data.length} rows of data`);
    
    // Step 2: Look specifically for includeInternalImpact
    console.log('🔍 Step 2: Looking for includeInternalImpact parameter...');
    let foundRow = -1;
    let rawValue = null;
    
    for (let i = 1; i < data.length; i++) { // Skip header row
      const [parameter, value] = data[i];
      console.log(`   Row ${i + 1}: "${parameter}" = "${value}" (type: ${typeof value})`);
      
      if (parameter === 'includeInternalImpact') {
        foundRow = i + 1; // Convert to 1-based row number
        rawValue = value;
        console.log(`   ✅ FOUND includeInternalImpact at row ${foundRow}`);
        console.log(`      Raw value: "${rawValue}" (type: ${typeof rawValue})`);
        break;
      }
    }
    
    if (foundRow === -1) {
      console.log('❌ includeInternalImpact parameter not found in Config sheet!');
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Parameter Not Found', 
        'includeInternalImpact parameter not found in Config sheet!\n\nThis explains why it\'s using the default value (true).\n\nUse the "Fix includeInternalImpact Config" function to add it.',
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Step 3: Test parseConfigValue function directly
    console.log('🧪 Step 3: Testing parseConfigValue function...');
    console.log(`   Input: "${rawValue}" (type: ${typeof rawValue})`);
    
    const parsedValue = parseConfigValue(rawValue);
    console.log(`   Parsed result: ${parsedValue} (type: ${typeof parsedValue})`);
    
    // Step 4: Test different variations
    console.log('🧪 Step 4: Testing parseConfigValue with different inputs...');
    const testValues = ['FALSE', 'false', 'False', 'TRUE', 'true', 'True', false, true];
    testValues.forEach(testValue => {
      const result = parseConfigValue(testValue);
      console.log(`   parseConfigValue("${testValue}") = ${result} (type: ${typeof result})`);
    });
    
    // Step 5: Get full configuration and check the result
    console.log('⚙️ Step 5: Getting full configuration...');
    const config = getConfiguration();
    console.log(`   config.includeInternalImpact = ${config.includeInternalImpact} (type: ${typeof config.includeInternalImpact})`);
    
    // Step 6: Check default configuration
    console.log('📋 Step 6: Checking default configuration...');
    const defaultConfig = getDefaultConfiguration();
    console.log(`   defaultConfig.includeInternalImpact = ${defaultConfig.includeInternalImpact} (type: ${typeof defaultConfig.includeInternalImpact})`);
    
    // Step 7: Show the merge process
    console.log('🔄 Step 7: Simulating configuration merge...');
    const sheetConfig = {};
    for (let i = 1; i < data.length; i++) {
      const [parameter, value] = data[i];
      if (parameter && value !== null && value !== undefined) {
        sheetConfig[parameter] = parseConfigValue(value);
        if (parameter === 'includeInternalImpact') {
          console.log(`   Sheet config: includeInternalImpact = ${sheetConfig[parameter]} (type: ${typeof sheetConfig[parameter]})`);
        }
      }
    }
    
    const mergedConfig = { ...defaultConfig, ...sheetConfig };
    console.log(`   Merged config: includeInternalImpact = ${mergedConfig.includeInternalImpact} (type: ${typeof mergedConfig.includeInternalImpact})`);
    
    // Step 8: Summary and recommendations
    console.log('📊 SUMMARY');
    console.log('==========');
    console.log(`Config sheet value: "${rawValue}"`);
    console.log(`Parsed value: ${parsedValue}`);
    console.log(`Final config value: ${config.includeInternalImpact}`);
    console.log(`Default config value: ${defaultConfig.includeInternalImpact}`);
    
    let diagnosis = '';
    if (config.includeInternalImpact !== parsedValue) {
      console.log('⚠️ MISMATCH DETECTED!');
      console.log('The parsed value does not match the final config value.');
      console.log('This suggests the default configuration is overriding the sheet value.');
      diagnosis = '⚠️ MISMATCH: Default config overriding sheet value';
    }
    
    if (parsedValue === true && rawValue.toString().toLowerCase() === 'false') {
      console.log('❌ PARSING ERROR DETECTED!');
      console.log('The parseConfigValue function is not correctly parsing FALSE values.');
      diagnosis = '❌ PARSING ERROR: FALSE not being parsed correctly';
    }
    
    if (parsedValue === false && config.includeInternalImpact === false) {
      console.log('✅ CONFIGURATION IS CORRECT!');
      diagnosis = '✅ Configuration is working correctly';
    }
    
    // Show results in UI
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🔍 Configuration Debug Results',
      `DEBUG RESULTS:\n\n` +
      `Config Sheet Value: "${rawValue}"\n` +
      `Parsed Value: ${parsedValue}\n` +
      `Final Config Value: ${config.includeInternalImpact}\n` +
      `Default Config Value: ${defaultConfig.includeInternalImpact}\n\n` +
      `DIAGNOSIS: ${diagnosis}\n\n` +
      `Check the Apps Script logs for detailed analysis.\n\n` +
      `${config.includeInternalImpact === false ? 'Internal Impact severities will be EXCLUDED' : 'Internal Impact severities will be INCLUDED'}`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Debug failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Debug Failed',
      `Configuration debug failed:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Fix the includeInternalImpact configuration by setting it to FALSE
 */
function fixIncludeInternalImpactConfig() {
  console.log('🔧 FIXING includeInternalImpact CONFIGURATION');
  console.log('==============================================');
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
    
    if (!sheet) {
      console.log('❌ Config sheet not found!');
      const ui = SpreadsheetApp.getUi();
      ui.alert('❌ Config sheet not found', 'Cannot fix configuration without Config sheet.', ui.ButtonSet.OK);
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    let currentValue = null;
    
    // Find the includeInternalImpact row
    for (let i = 1; i < data.length; i++) {
      const [parameter, value] = data[i];
      if (parameter === 'includeInternalImpact') {
        foundRow = i + 1; // Convert to 1-based row number
        currentValue = value;
        console.log(`   Found includeInternalImpact at row ${foundRow}, current value: "${value}"`);
        break;
      }
    }
    
    if (foundRow === -1) {
      console.log('❌ includeInternalImpact parameter not found in Config sheet!');
      
      // Add it to the end
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1).setValue('includeInternalImpact');
      sheet.getRange(newRow, 2).setValue('FALSE');
      console.log(`✅ Added includeInternalImpact = FALSE at row ${newRow}`);
      foundRow = newRow;
      currentValue = 'FALSE';
    } else {
      // Update the existing row
      sheet.getRange(foundRow, 2).setValue('FALSE');
      console.log(`✅ Updated includeInternalImpact to FALSE at row ${foundRow}`);
      currentValue = 'FALSE';
    }
    
    // Test the fix
    console.log('🧪 Testing the fix...');
    const config = getConfiguration();
    console.log(`   New config.includeInternalImpact = ${config.includeInternalImpact} (type: ${typeof config.includeInternalImpact})`);
    
    // Verify it's actually false
    if (config.includeInternalImpact === false) {
      console.log('✅ SUCCESS! includeInternalImpact is now correctly set to false');
      
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '✅ Configuration Fixed!',
        `includeInternalImpact has been successfully set to FALSE.\n\n` +
        `BEFORE: Internal Impact severities were being included\n` +
        `AFTER: Internal Impact severities will be excluded\n\n` +
        `The weekly report will now respect this setting and exclude Internal Impact severity incidents.\n\n` +
        `You can verify this by running "Check Missing Fields Now" and observing that Internal Impact incidents are filtered out.`,
        ui.ButtonSet.OK
      );
    } else {
      console.log('❌ FAILED! includeInternalImpact is still not false');
      console.log(`   Expected: false, Got: ${config.includeInternalImpact} (type: ${typeof config.includeInternalImpact})`);
      
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '❌ Fix Failed',
        `Failed to set includeInternalImpact to false.\n\n` +
        `Current value: ${config.includeInternalImpact}\n` +
        `Expected: false\n\n` +
        `This might be a caching issue. Try:\n` +
        `1. Refresh the Google Sheet\n` +
        `2. Run the debug function again\n` +
        `3. Manually edit the Config sheet if needed`,
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Fix Failed',
      `Failed to fix includeInternalImpact configuration:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Test configuration system with various parameter types
 */
function testConfigurationSystem() {
  console.log('🧪 TESTING CONFIGURATION SYSTEM');
  console.log('=================================');
  
  try {
    const config = getConfiguration();
    
    console.log('📋 Current Configuration:');
    console.log(`   enableSeverityFiltering: ${config.enableSeverityFiltering} (${typeof config.enableSeverityFiltering})`);
    console.log(`   includeInternalImpact: ${config.includeInternalImpact} (${typeof config.includeInternalImpact})`);
    console.log(`   incidentioSeverities: ${JSON.stringify(config.incidentioSeverities)} (${typeof config.incidentioSeverities})`);
    console.log(`   maxLookbackDays: ${config.maxLookbackDays} (${typeof config.maxLookbackDays})`);
    console.log(`   emailFocusDays: ${config.emailFocusDays} (${typeof config.emailFocusDays})`);
    console.log(`   businessUnits: ${JSON.stringify(config.businessUnits)} (${typeof config.businessUnits})`);
    
    // Test parseConfigValue function
    console.log('🧪 Testing parseConfigValue function:');
    const testCases = [
      { input: 'true', expected: true, type: 'boolean' },
      { input: 'false', expected: false, type: 'boolean' },
      { input: 'TRUE', expected: true, type: 'boolean' },
      { input: 'FALSE', expected: false, type: 'boolean' },
      { input: '123', expected: 123, type: 'number' },
      { input: '45.67', expected: 45.67, type: 'number' },
      { input: 'SEV0,SEV1,SEV2', expected: ['SEV0', 'SEV1', 'SEV2'], type: 'array' },
      { input: 'hello world', expected: 'hello world', type: 'string' },
      { input: true, expected: true, type: 'boolean' },
      { input: false, expected: false, type: 'boolean' },
      { input: 42, expected: 42, type: 'number' }
    ];
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    testCases.forEach((testCase, index) => {
      const result = parseConfigValue(testCase.input);
      const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
      
      console.log(`   Test ${index + 1}: parseConfigValue(${JSON.stringify(testCase.input)}) = ${JSON.stringify(result)} (${typeof result}) ${passed ? '✅' : '❌'}`);
      
      if (passed) {
        passedTests++;
      } else {
        console.log(`      Expected: ${JSON.stringify(testCase.expected)} (${testCase.type})`);
      }
    });
    
    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🧪 Configuration System Test Complete',
      `Configuration system test completed!\n\n` +
      `Tests Passed: ${passedTests}/${totalTests}\n\n` +
      `Current Settings:\n` +
      `• Severity Filtering: ${config.enableSeverityFiltering ? 'ENABLED' : 'DISABLED'}\n` +
      `• Include Internal Impact: ${config.includeInternalImpact ? 'YES' : 'NO'}\n` +
      `• incident.io Severities: ${config.incidentioSeverities?.join(', ') || 'None'}\n` +
      `• Lookback Days: ${config.maxLookbackDays}\n\n` +
      `Check the Apps Script logs for detailed test results.`,
      ui.ButtonSet.OK
    );
    
    return { passedTests, totalTests, config };
    
  } catch (error) {
    console.error('❌ Configuration system test failed:', error.toString());
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Test Failed',
      `Configuration system test failed:\n\n${error.toString()}`,
      ui.ButtonSet.OK
    );
    
    throw error;
  }
}

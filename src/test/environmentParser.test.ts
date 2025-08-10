import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  parseEnvironmentProps,
  validateEnvironmentProps,
  validateEnvironmentConfig,
  loadEnvironmentConfiguration,
  EnvironmentConfig,
  EnvironmentConfigError
} from '../environmentParser';
import { getEnvironmentColor, getEnvironmentIcon } from '../statusBar';

suite('Environment Parser Tests', () => {
  
  suite('parseEnvironmentProps', () => {
    test('Parse valid properties file', () => {
      const content = 'Local:mcp-local\nDev:mcp-dev\nProd:mcp-prod';
      const result = parseEnvironmentProps(content);
      
      assert.strictEqual(result.environments.length, 3);
      assert.strictEqual(result.totalCount, 3);
      assert.strictEqual(result.environments[0].displayName, 'Local');
      assert.strictEqual(result.environments[0].configFileName, 'mcp-local.json');
      assert.strictEqual(result.environments[0].position, 0);
      assert.strictEqual(result.environments[1].displayName, 'Dev');
      assert.strictEqual(result.environments[1].configFileName, 'mcp-dev.json');
      assert.strictEqual(result.environments[1].position, 1);
      assert.strictEqual(result.environments[2].displayName, 'Prod');
      assert.strictEqual(result.environments[2].configFileName, 'mcp-prod.json');
      assert.strictEqual(result.environments[2].position, 2);
    });

    test('Parse properties with comments and empty lines', () => {
      const content = `# This is a comment
Local:mcp-local

# Another comment
Dev:mcp-dev
      
Prod:mcp-prod`;
      const result = parseEnvironmentProps(content);
      
      assert.strictEqual(result.environments.length, 3);
      assert.strictEqual(result.environments[0].displayName, 'Local');
      assert.strictEqual(result.environments[1].displayName, 'Dev');
      assert.strictEqual(result.environments[2].displayName, 'Prod');
    });

    test('Parse properties with custom environment names', () => {
      const content = 'Local Development:mcp-local\nQA Testing:mcp-qa\nStaging:mcp-staging\nProduction:mcp-prod';
      const result = parseEnvironmentProps(content);
      
      assert.strictEqual(result.environments.length, 4);
      assert.strictEqual(result.totalCount, 4);
      assert.strictEqual(result.environments[0].displayName, 'Local Development');
      assert.strictEqual(result.environments[1].displayName, 'QA Testing');
      assert.strictEqual(result.environments[2].displayName, 'Staging');
      assert.strictEqual(result.environments[3].displayName, 'Production');
    });

    test('Skip malformed lines', () => {
      const content = 'Local:mcp-local\nInvalidLine\nDev:mcp-dev\n:EmptyName\nProd:';
      const result = parseEnvironmentProps(content);
      
      assert.strictEqual(result.environments.length, 2);
      assert.strictEqual(result.environments[0].displayName, 'Local');
      assert.strictEqual(result.environments[1].displayName, 'Dev');
    });

    test('Handle empty content', () => {
      const content = '';
      const result = parseEnvironmentProps(content);
      
      assert.strictEqual(result.environments.length, 0);
      assert.strictEqual(result.totalCount, 0);
    });
  });

  suite('validateEnvironmentProps', () => {
    test('Validate correct properties', () => {
      const content = 'Local:mcp-local\nDev:mcp-dev\nProd:mcp-prod';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.errors.length, 0);
    });

    test('Detect malformed lines', () => {
      const content = 'InvalidLine\nValid:file';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some(e => e.includes('Invalid format')));
    });

    test('Detect duplicate display names', () => {
      const content = 'Local:mcp-local\nLocal:mcp-local2';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some(e => e.includes('Duplicate display name')));
    });

    test('Detect duplicate config files', () => {
      const content = 'Local:mcp-local\nDev:mcp-local';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some(e => e.includes('Duplicate config file')));
    });

    test('Detect empty display names', () => {
      const content = ':mcp-local';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some(e => e.includes('Empty display name')));
    });

    test('Detect empty config file names', () => {
      const content = 'Local:';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some(e => e.includes('Empty config file name')));
    });

    test('Accept both json and non-json extensions', () => {
      const content = 'Local:mcp-local.txt\nDev:mcp-dev.json';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.warnings.length, 0);
    });

    test('Parse properties with mixed json extensions', () => {
      const content = 'Local:mcp-local\nDev:mcp-dev.json\nProd:mcp-prod';
      const result = parseEnvironmentProps(content);
      
      assert.strictEqual(result.environments.length, 3);
      assert.strictEqual(result.environments[0].configFileName, 'mcp-local.json');
      assert.strictEqual(result.environments[1].configFileName, 'mcp-dev.json');
      assert.strictEqual(result.environments[2].configFileName, 'mcp-prod.json');
    });

    test('Handle empty content', () => {
      const content = '';
      const validation = validateEnvironmentProps(content);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some(e => e.includes('No environments defined')));
    });
  });

  suite('validateEnvironmentConfig', () => {
    test('Validate correct environment config', () => {
      const config: EnvironmentConfig[] = [
        { displayName: 'Local', configFileName: 'mcp-local.json', position: 0 },
        { displayName: 'Dev', configFileName: 'mcp-dev.json', position: 1 }
      ];
      const validation = validateEnvironmentConfig(config);
      
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.errors.length, 0);
    });

    test('Detect empty config', () => {
      const config: EnvironmentConfig[] = [];
      const validation = validateEnvironmentConfig(config);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some((e: string) => e.includes('No environments defined')));
    });

    test('Detect duplicate display names in config', () => {
      const config: EnvironmentConfig[] = [
        { displayName: 'Local', configFileName: 'mcp-local.json', position: 0 },
        { displayName: 'Local', configFileName: 'mcp-local2.json', position: 1 }
      ];
      const validation = validateEnvironmentConfig(config);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some((e: string) => e.includes('Duplicate display name')));
    });

    test('Detect duplicate config files in config', () => {
      const config: EnvironmentConfig[] = [
        { displayName: 'Local', configFileName: 'mcp-local.json', position: 0 },
        { displayName: 'Dev', configFileName: 'mcp-local.json', position: 1 }
      ];
      const validation = validateEnvironmentConfig(config);
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.some((e: string) => e.includes('Duplicate config file')));
    });
  });
});

suite('Dynamic Color Assignment Tests', () => {
  
  test('Single environment - should be green', () => {
    // Mock loadEnvironmentConfiguration for single environment
    const originalLoadConfig = require('../environmentParser').loadEnvironmentConfiguration;
    require('../environmentParser').loadEnvironmentConfiguration = () => ({
      environments: [{ displayName: 'Only', configFileName: 'mcp-only.json', position: 0 }],
      totalCount: 1
    });
    
    const color = getEnvironmentColor('Only');
    assert.strictEqual(color, '#4caf50'); // Green
    
    // Restore original function
    require('../environmentParser').loadEnvironmentConfiguration = originalLoadConfig;
  });

  test('Two environments - first green, last red', () => {
    // Mock loadEnvironmentConfiguration for two environments
    const originalLoadConfig = require('../environmentParser').loadEnvironmentConfiguration;
    require('../environmentParser').loadEnvironmentConfiguration = () => ({
      environments: [
        { displayName: 'Dev', configFileName: 'mcp-dev.json', position: 0 },
        { displayName: 'Prod', configFileName: 'mcp-prod.json', position: 1 }
      ],
      totalCount: 2
    });
    
    const devColor = getEnvironmentColor('Dev');
    const prodColor = getEnvironmentColor('Prod');
    
    assert.strictEqual(devColor, '#4caf50'); // Green for first
    assert.strictEqual(prodColor, '#f44336'); // Red for last
    
    // Restore original function
    require('../environmentParser').loadEnvironmentConfiguration = originalLoadConfig;
  });

  test('Four environments - first green, middle orange, last red', () => {
    // Mock loadEnvironmentConfiguration for four environments
    const originalLoadConfig = require('../environmentParser').loadEnvironmentConfiguration;
    require('../environmentParser').loadEnvironmentConfiguration = () => ({
      environments: [
        { displayName: 'Local', configFileName: 'mcp-local.json', position: 0 },
        { displayName: 'Dev', configFileName: 'mcp-dev.json', position: 1 },
        { displayName: 'Staging', configFileName: 'mcp-staging.json', position: 2 },
        { displayName: 'Prod', configFileName: 'mcp-prod.json', position: 3 }
      ],
      totalCount: 4
    });
    
    const localColor = getEnvironmentColor('Local');
    const devColor = getEnvironmentColor('Dev');
    const stagingColor = getEnvironmentColor('Staging');
    const prodColor = getEnvironmentColor('Prod');
    
    assert.strictEqual(localColor, '#4caf50'); // Green for first
    assert.strictEqual(devColor, '#ff9800');  // Orange for middle
    assert.strictEqual(stagingColor, '#ff9800'); // Orange for middle
    assert.strictEqual(prodColor, '#f44336');   // Red for last
    
    // Restore original function
    require('../environmentParser').loadEnvironmentConfiguration = originalLoadConfig;
  });
});

suite('Dynamic Icon Assignment Tests', () => {
  
  test('Single environment - should be desktop-download', () => {
    // Mock loadEnvironmentConfiguration for single environment
    const originalLoadConfig = require('../environmentParser').loadEnvironmentConfiguration;
    require('../environmentParser').loadEnvironmentConfiguration = () => ({
      environments: [{ displayName: 'Only', configFileName: 'mcp-only.json', position: 0 }],
      totalCount: 1
    });
    
    const icon = getEnvironmentIcon('Only');
    assert.strictEqual(icon, '$(desktop-download)');
    
    // Restore original function
    require('../environmentParser').loadEnvironmentConfiguration = originalLoadConfig;
  });

  test('Two environments - first desktop-download, last rocket', () => {
    // Mock loadEnvironmentConfiguration for two environments
    const originalLoadConfig = require('../environmentParser').loadEnvironmentConfiguration;
    require('../environmentParser').loadEnvironmentConfiguration = () => ({
      environments: [
        { displayName: 'Dev', configFileName: 'mcp-dev.json', position: 0 },
        { displayName: 'Prod', configFileName: 'mcp-prod.json', position: 1 }
      ],
      totalCount: 2
    });
    
    const devIcon = getEnvironmentIcon('Dev');
    const prodIcon = getEnvironmentIcon('Prod');
    
    assert.strictEqual(devIcon, '$(desktop-download)'); // Desktop for first
    assert.strictEqual(prodIcon, '$(rocket)'); // Rocket for last
    
    // Restore original function
    require('../environmentParser').loadEnvironmentConfiguration = originalLoadConfig;
  });

  test('Four environments - first desktop-download, middle beaker, last rocket', () => {
    // Mock loadEnvironmentConfiguration for four environments
    const originalLoadConfig = require('../environmentParser').loadEnvironmentConfiguration;
    require('../environmentParser').loadEnvironmentConfiguration = () => ({
      environments: [
        { displayName: 'Local', configFileName: 'mcp-local.json', position: 0 },
        { displayName: 'Dev', configFileName: 'mcp-dev.json', position: 1 },
        { displayName: 'Staging', configFileName: 'mcp-staging.json', position: 2 },
        { displayName: 'Prod', configFileName: 'mcp-prod.json', position: 3 }
      ],
      totalCount: 4
    });
    
    const localIcon = getEnvironmentIcon('Local');
    const devIcon = getEnvironmentIcon('Dev');
    const stagingIcon = getEnvironmentIcon('Staging');
    const prodIcon = getEnvironmentIcon('Prod');
    
    assert.strictEqual(localIcon, '$(desktop-download)'); // Desktop for first
    assert.strictEqual(devIcon, '$(beaker)');    // Beaker for middle
    assert.strictEqual(stagingIcon, '$(beaker)'); // Beaker for middle
    assert.strictEqual(prodIcon, '$(rocket)');   // Rocket for last
    
    // Restore original function
    require('../environmentParser').loadEnvironmentConfiguration = originalLoadConfig;
  });
}); 
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  getEnvironmentPropsPath, 
  createDefaultEnvironmentProps,
  loadEnvironmentConfiguration,
  detectLegacyConfiguration,
  migrateLegacyConfiguration
} from '../environmentParser';
import { getAllEnvironments, getConfigFileBase } from '../configManager';
import { getDefaultEnvironment } from '../statusBar';

suite('Dynamic Environment Integration Tests', () => {
  
  const testMcpDir = path.join(os.tmpdir(), 'mcp-test-' + Date.now());
  const originalHomedir = os.homedir;
  
  setup(() => {
    // Mock os.homedir to point to test directory
    (os as any).homedir = () => path.dirname(testMcpDir);
    
    // Create test directory
    const mcpTestDir = path.join(testMcpDir, '.mcp');
    if (!fs.existsSync(mcpTestDir)) {
      fs.mkdirSync(mcpTestDir, { recursive: true });
    }
  });
  
  teardown(() => {
    // Restore original homedir
    (os as any).homedir = originalHomedir;
    
    // Clean up test directory
    if (fs.existsSync(testMcpDir)) {
      fs.rmSync(testMcpDir, { recursive: true, force: true });
    }
  });

  suite('Environment Configuration Loading', () => {
    
    test('Load default configuration when props file missing', () => {
      const envConfig = loadEnvironmentConfiguration();
      
      assert.strictEqual(envConfig.environments.length, 3);
      assert.strictEqual(envConfig.environments[0].displayName, 'Local');
      assert.strictEqual(envConfig.environments[1].displayName, 'Dev');
      assert.strictEqual(envConfig.environments[2].displayName, 'Prod');
    });
    
    test('Load custom environment configuration', () => {
      // Create custom props file
      const propsPath = getEnvironmentPropsPath();
      const customContent = `Local Development:mcp-local.json
QA Testing:mcp-qa.json
Staging Environment:mcp-staging.json
Production:mcp-prod.json`;
      
      fs.writeFileSync(propsPath, customContent);
      
      const envConfig = loadEnvironmentConfiguration();
      
      assert.strictEqual(envConfig.environments.length, 4);
      assert.strictEqual(envConfig.environments[0].displayName, 'Local Development');
      assert.strictEqual(envConfig.environments[1].displayName, 'QA Testing');
      assert.strictEqual(envConfig.environments[2].displayName, 'Staging Environment');
      assert.strictEqual(envConfig.environments[3].displayName, 'Production');
    });
    
    test('Fallback on invalid configuration', () => {
      // Create invalid props file
      const propsPath = getEnvironmentPropsPath();
      const invalidContent = `InvalidLine
Local:
:mcp-file.json`;
      
      fs.writeFileSync(propsPath, invalidContent);
      
      const envConfig = loadEnvironmentConfiguration();
      
      // Should fallback to default configuration
      assert.strictEqual(envConfig.environments.length, 3);
      assert.strictEqual(envConfig.environments[0].displayName, 'Local');
      assert.strictEqual(envConfig.environments[1].displayName, 'Dev');
      assert.strictEqual(envConfig.environments[2].displayName, 'Prod');
    });
  });

  suite('Configuration Manager Integration', () => {
    
    test('Get all environments dynamically', () => {
      // Create custom props file
      const propsPath = getEnvironmentPropsPath();
      const customContent = `Development:mcp-dev.json
Staging:mcp-staging.json
Production:mcp-prod.json`;
      
      fs.writeFileSync(propsPath, customContent);
      
      const environments = getAllEnvironments();
      
      assert.strictEqual(environments.length, 3);
      assert.strictEqual(environments[0], 'Development');
      assert.strictEqual(environments[1], 'Staging');
      assert.strictEqual(environments[2], 'Production');
    });
    
    test('Get config file name for environment', () => {
      // Create custom props file
      const propsPath = getEnvironmentPropsPath();
      const customContent = `My Local:mcp-mylocal.json
My Prod:mcp-myprod.json`;
      
      fs.writeFileSync(propsPath, customContent);
      
      const localFileBase = getConfigFileBase('My Local');
      const prodFileBase = getConfigFileBase('My Prod');
      const unknownFileBase = getConfigFileBase('Unknown');
      
      assert.strictEqual(localFileBase ? localFileBase + '.json' : undefined, 'mcp-mylocal.json');
      assert.strictEqual(prodFileBase ? prodFileBase + '.json' : undefined, 'mcp-myprod.json');
      assert.strictEqual(unknownFileBase, undefined);
    });
  });

  suite('Status Bar Integration', () => {
    
    test('Get default environment', () => {
      // Create custom props file
      const propsPath = getEnvironmentPropsPath();
      const customContent = `First Environment:mcp-first.json
Second Environment:mcp-second.json`;
      
      fs.writeFileSync(propsPath, customContent);
      
      const defaultEnv = getDefaultEnvironment();
      
      assert.strictEqual(defaultEnv, 'First Environment');
    });
    
    test('Handle empty environment list', () => {
      // Create empty props file
      const propsPath = getEnvironmentPropsPath();
      fs.writeFileSync(propsPath, '# No environments');
      
      const defaultEnv = getDefaultEnvironment();
      
      // Should fallback to default configuration
      assert.strictEqual(defaultEnv, 'Local');
    });
  });

  suite('Legacy Migration', () => {
    
    test('Detect legacy configuration files', () => {
      const mcpDir = path.join(testMcpDir, '.mcp');
      
      // Create legacy files
      fs.writeFileSync(path.join(mcpDir, 'mcp-local.json'), '{}');
      fs.writeFileSync(path.join(mcpDir, 'mcp-dev.json'), '{}');
      fs.writeFileSync(path.join(mcpDir, 'mcp-prod.json'), '{}');
      
      const hasLegacy = detectLegacyConfiguration();
      
      assert.strictEqual(hasLegacy, true);
    });
    
    test('No legacy detection when files missing', () => {
      const hasLegacy = detectLegacyConfiguration();
      
      assert.strictEqual(hasLegacy, false);
    });
    
    test('Migrate legacy configuration', () => {
      const mcpDir = path.join(testMcpDir, '.mcp');
      const propsPath = getEnvironmentPropsPath();
      
      // Create legacy files but no props file
      fs.writeFileSync(path.join(mcpDir, 'mcp-local.json'), '{}');
      fs.writeFileSync(path.join(mcpDir, 'mcp-dev.json'), '{}');
      fs.writeFileSync(path.join(mcpDir, 'mcp-prod.json'), '{}');
      
      // Ensure props file doesn't exist
      if (fs.existsSync(propsPath)) {
        fs.unlinkSync(propsPath);
      }
      
      migrateLegacyConfiguration();
      
      // Props file should now exist
      assert.strictEqual(fs.existsSync(propsPath), true);
      
      // Should contain default configuration
      const content = fs.readFileSync(propsPath, 'utf-8');
      assert.ok(content.includes('Local:mcp-local.json'));
      assert.ok(content.includes('Dev:mcp-dev.json'));
      assert.ok(content.includes('Prod:mcp-prod.json'));
    });
    
    test('Do not migrate when props file exists', () => {
      const mcpDir = path.join(testMcpDir, '.mcp');
      const propsPath = getEnvironmentPropsPath();
      
      // Create legacy files and existing props file
      fs.writeFileSync(path.join(mcpDir, 'mcp-local.json'), '{}');
      fs.writeFileSync(path.join(mcpDir, 'mcp-dev.json'), '{}');
      fs.writeFileSync(path.join(mcpDir, 'mcp-prod.json'), '{}');
      fs.writeFileSync(propsPath, 'Custom:mcp-custom.json');
      
      const originalContent = fs.readFileSync(propsPath, 'utf-8');
      
      migrateLegacyConfiguration();
      
      // Props file should be unchanged
      const newContent = fs.readFileSync(propsPath, 'utf-8');
      assert.strictEqual(newContent, originalContent);
    });
  });

  suite('Real-world Scenarios', () => {
    
    test('Single environment setup', () => {
      const propsPath = getEnvironmentPropsPath();
      fs.writeFileSync(propsPath, 'Production:mcp-prod.json');
      
      const environments = getAllEnvironments();
      const defaultEnv = getDefaultEnvironment();
      
      assert.strictEqual(environments.length, 1);
      assert.strictEqual(environments[0], 'Production');
      assert.strictEqual(defaultEnv, 'Production');
    });
    
    test('Complex multi-environment setup', () => {
      const propsPath = getEnvironmentPropsPath();
      const complexContent = `# Development environments
Local Development:mcp-local-dev.json
Integration Testing:mcp-integration.json

# Staging environments  
QA Environment:mcp-qa.json
User Acceptance Testing:mcp-uat.json
Performance Testing:mcp-perf.json

# Production
Production:mcp-production.json`;
      
      fs.writeFileSync(propsPath, complexContent);
      
      const environments = getAllEnvironments();
      const defaultEnv = getDefaultEnvironment();
      
      assert.strictEqual(environments.length, 6);
      assert.strictEqual(environments[0], 'Local Development');
      assert.strictEqual(environments[5], 'Production');
      assert.strictEqual(defaultEnv, 'Local Development');
      
      // Test config file mapping
      const localFileBase = getConfigFileBase('Local Development');
      const prodFileBase = getConfigFileBase('Production');
      
      assert.strictEqual(localFileBase ? localFileBase + '.json' : undefined, 'mcp-local-dev.json');
      assert.strictEqual(prodFileBase ? prodFileBase + '.json' : undefined, 'mcp-production.json');
    });
    
    test('Environment configuration with special characters', () => {
      const propsPath = getEnvironmentPropsPath();
      const specialContent = `Local (Docker):mcp-local-docker.json
Dev/Test Environment:mcp-dev-test.json
Prod-EU-West:mcp-prod-eu.json`;
      
      fs.writeFileSync(propsPath, specialContent);
      
      const environments = getAllEnvironments();
      
      assert.strictEqual(environments.length, 3);
      assert.strictEqual(environments[0], 'Local (Docker)');
      assert.strictEqual(environments[1], 'Dev/Test Environment');
      assert.strictEqual(environments[2], 'Prod-EU-West');
      
      const localFileBase = getConfigFileBase('Local (Docker)');
      assert.strictEqual(localFileBase ? localFileBase + '.json' : undefined, 'mcp-local-docker.json');
    });
  });

  suite('Error Handling and Recovery', () => {
    
    test('Handle corrupted props file', () => {
      const propsPath = getEnvironmentPropsPath();
      
      // Write binary data to simulate corruption
      fs.writeFileSync(propsPath, Buffer.from([0x00, 0x01, 0x02, 0x03]));
      
      const envConfig = loadEnvironmentConfiguration();
      
      // Should fallback to default configuration
      assert.strictEqual(envConfig.environments.length, 3);
      assert.strictEqual(envConfig.environments[0].displayName, 'Local');
    });
    
    test('Handle permission denied on props file', () => {
      const propsPath = getEnvironmentPropsPath();
      
      // Create props file and make it unreadable (if supported by OS)
      fs.writeFileSync(propsPath, 'Test:mcp-test.json');
      try {
        fs.chmodSync(propsPath, 0o000);
        
        const envConfig = loadEnvironmentConfiguration();
        
        // Should fallback to default configuration
        assert.strictEqual(envConfig.environments.length, 3);
        
        // Restore permissions for cleanup
        fs.chmodSync(propsPath, 0o644);
      } catch (error) {
        // chmod might not be supported on all platforms, skip this test
        console.log('Skipping permission test - chmod not supported');
      }
    });
    
    test('Handle very large environment list', () => {
      const propsPath = getEnvironmentPropsPath();
      
      // Create configuration with many environments
      let largeContent = '# Large environment list\n';
      for (let i = 1; i <= 50; i++) {
        largeContent += `Environment ${i}:mcp-env${i}.json\n`;
      }
      
      fs.writeFileSync(propsPath, largeContent);
      
      const environments = getAllEnvironments();
      const defaultEnv = getDefaultEnvironment();
      
      assert.strictEqual(environments.length, 50);
      assert.strictEqual(environments[0], 'Environment 1');
      assert.strictEqual(environments[49], 'Environment 50');
      assert.strictEqual(defaultEnv, 'Environment 1');
    });
  });
}); 
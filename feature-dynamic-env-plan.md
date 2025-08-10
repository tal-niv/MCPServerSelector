# Dynamic Environment Configuration - Implementation Plan

## Feature Overview

Transform the MCP Server Selector from using hard-coded environments (`local`, `dev`, `prod`) to a dynamic system that reads environment configurations from a `mcp-environments.props` file. This will allow users to define custom environments with personalized names and configurations while maintaining the visual safety indicators through intelligent color assignment.

## Current Architecture Analysis

### Hard-Coded Limitations
```typescript
// Current rigid implementation
export type MCPEnvironment = 'local' | 'dev' | 'prod';
export const MCP_CONFIG_FILES: Record<MCPEnvironment, string> = {
  local: 'mcp-local.json',
  dev: 'mcp-dev.json', 
  prod: 'mcp-prod.json',
};
const ENV_ORDER: MCPEnvironment[] = ['local', 'dev', 'prod'];
```

### Issues to Address
1. **Inflexible Environment Names**: Users cannot customize environment labels
2. **Fixed Environment Count**: Only supports exactly 3 environments
3. **Predefined Configuration Files**: File names are hardcoded to pattern
4. **Static Color Assignment**: Colors tied to specific environment names
5. **No User Customization**: Cannot add staging, QA, or other custom environments

## New Feature Requirements

### Configuration File Format
**Location**: `~/.cursor/mcp-selector/mcp-environments.props`

**Format**: Properties file with `DisplayName:ConfigFileName` pairs
```properties
Local:mcp-local.json
Development:mcp-dev.json  
Staging:mcp-staging.json
Production:mcp-prod.json
```

### Color Assignment Rules
- **First Environment** (safest): Green (`#4caf50`)
- **Last Environment** (most dangerous): Red (`#f44336`)  
- **Middle Environments**: Orange (`#ff9800`)
- **Single Environment**: Green (default safe)
- **Two Environments**: Green (first) + Red (last)

### Visual Icon Assignment
- **First Environment**: `$(desktop-download)` (local development)
- **Last Environment**: `$(rocket)` (production deployment)
- **Middle Environments**: `$(beaker)` (testing/staging)

## Implementation Plan

## Phase 1: Environment Configuration Parser

### 1.1 Create Environment Properties Parser
**New File**: `src/environmentParser.ts`

```typescript
export interface EnvironmentConfig {
  displayName: string;
  configFileName: string;
  position: number; // 0-based index for color/icon assignment
}

export interface EnvironmentCollection {
  environments: EnvironmentConfig[];
  totalCount: number;
}

export function parseEnvironmentProps(propsContent: string): EnvironmentCollection {
  // Parse properties file format
  // Handle comments, empty lines, malformed entries
  // Return structured environment data
}

export function getEnvironmentPropsPath(): string {
  const home = os.homedir();
  const mcpDir = path.join(home, '.cursor', 'mcp-selector');
  return path.join(mcpDir, 'mcp-environments.props');
}

export function loadEnvironmentConfiguration(): EnvironmentCollection {
  // Load and parse the props file
  // Provide fallback to default configuration
}
```

**Implementation Details**:
- **Error Handling**: Graceful parsing with detailed error messages
- **Validation**: Ensure config file names are valid and exist
- **Ordering**: Preserve order from properties file
- **Comments Support**: Allow `#` comments in properties file
- **Fallback Strategy**: Use default configuration if props file missing/invalid

### 1.2 Properties File Validation
```typescript
export function validateEnvironmentConfig(config: EnvironmentConfig[]): ValidationResult {
  // Check for duplicate display names
  // Validate config file existence  
  // Ensure at least one environment defined
  // Validate file name patterns
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 1.3 Default Configuration Generator
```typescript
export function createDefaultEnvironmentProps(): void {
  // Create default mcp-environments.props if missing
  // Include helpful comments explaining format
}

const DEFAULT_ENVIRONMENTS_CONTENT = `# MCP Environment Configuration
# Format: DisplayName:ConfigFileName
# First environment = safest (green), last = most dangerous (red)
Local:mcp-local.json
Dev:mcp-dev.json
Prod:mcp-prod.json`;
```

## Phase 2: Dynamic Type System Refactoring

### 2.1 Replace Hard-Coded Types
**File**: `src/configManager.ts`

**Before**:
```typescript
export type MCPEnvironment = 'local' | 'dev' | 'prod';
export const MCP_CONFIG_FILES: Record<MCPEnvironment, string> = {
  local: 'mcp-local.json',
  dev: 'mcp-dev.json',
  prod: 'mcp-prod.json',
};
```

**After**:
```typescript
// Remove hard-coded type, use runtime environment discovery
export type MCPEnvironment = string; // Dynamic environment name

// Replace with dynamic function
export function getConfigFileName(displayName: string): string | undefined {
  const envConfig = loadEnvironmentConfiguration();
  const env = envConfig.environments.find(e => e.displayName === displayName);
  return env?.configFileName;
}

export function getAllEnvironments(): string[] {
  return loadEnvironmentConfiguration().environments.map(e => e.displayName);
}
```

### 2.2 Dynamic Configuration File Paths
```typescript
export function getConfigFilePath(displayName: string): string {
  const home = os.homedir();
  const mcpDir = path.join(home, '.cursor', '.mcp');
  const fileName = getConfigFileName(displayName);
  
  if (!fileName) {
    throw new Error(`Unknown environment: ${displayName}`);
  }
  
  return path.join(mcpDir, fileName);
}

export function ensureAllConfigFiles(): void {
  const envConfig = loadEnvironmentConfiguration();
  envConfig.environments.forEach(env => {
    ensureConfigFile(env.displayName);
  });
}
```

## Phase 3: Dynamic Visual System

### 3.1 Color Assignment Logic
**File**: `src/statusBar.ts`

```typescript
export function getEnvironmentColor(displayName: string): string {
  const envConfig = loadEnvironmentConfiguration();
  const env = envConfig.environments.find(e => e.displayName === displayName);
  
  if (!env) return '#4caf50'; // Default green
  
  const { position } = env;
  const { totalCount } = envConfig;
  
  if (totalCount === 1) return '#4caf50'; // Green for single env
  if (position === 0) return '#4caf50';    // Green for first (safest)
  if (position === totalCount - 1) return '#f44336'; // Red for last (dangerous)
  return '#ff9800'; // Orange for middle environments
}
```

### 3.2 Icon Assignment Logic
```typescript
export function getEnvironmentIcon(displayName: string): string {
  const envConfig = loadEnvironmentConfiguration();
  const env = envConfig.environments.find(e => e.displayName === displayName);
  
  if (!env) return '$(desktop-download)'; // Default
  
  const { position } = env;
  const { totalCount } = envConfig;
  
  if (totalCount === 1) return '$(desktop-download)';
  if (position === 0) return '$(desktop-download)';    // Local development
  if (position === totalCount - 1) return '$(rocket)'; // Production
  return '$(beaker)'; // Testing/staging
}
```

### 3.3 Dynamic Status Bar Updates
```typescript
// Replace hard-coded records with dynamic functions
export function updateStatusBarEnvironment(context: vscode.ExtensionContext) {
  const currentEnv = context.workspaceState.get<string>('mcpCurrentEnv') || getDefaultEnvironment();
  
  statusBarItem!.text = `${getEnvironmentIcon(currentEnv)} MCP: ${currentEnv}`;
  statusBarItem!.color = getEnvironmentColor(currentEnv);
  
  const configPath = getConfigFilePath(currentEnv);
  const cursorPath = getCursorMcpPath();
  statusBarItem!.tooltip = `Current MCP Environment: ${currentEnv}\nSource: ${configPath}\nActive: ${cursorPath}\n\nClick to select environment`;
}

function getDefaultEnvironment(): string {
  const envConfig = loadEnvironmentConfiguration();
  return envConfig.environments[0]?.displayName || 'Local';
}
```

## Phase 4: Environment Switching Logic Updates

### 4.1 Dynamic Environment Cycling
**File**: `src/mcpSelector.ts`

```typescript
export function switchEnvironment(context: vscode.ExtensionContext) {
  const envConfig = loadEnvironmentConfiguration();
  const envNames = envConfig.environments.map(e => e.displayName);
  
  const current = context.workspaceState.get<string>('mcpCurrentEnv') || envNames[0];
  const currentIndex = envNames.indexOf(current);
  const nextIndex = (currentIndex + 1) % envNames.length;
  const nextEnv = envNames[nextIndex];
  
  context.workspaceState.update('mcpCurrentEnv', nextEnv);
  updateStatusBarEnvironment(context);
  
  if (copyConfigToCursor(nextEnv)) {
    vscode.window.showInformationMessage(`Switched MCP environment to ${nextEnv}`);
  } else {
    vscode.window.showErrorMessage(`Failed to switch to ${nextEnv} environment. Config file not found.`);
  }
}
```

### 4.2 Dynamic Environment Selection
```typescript
export async function selectEnvironment(context: vscode.ExtensionContext) {
  const envConfig = loadEnvironmentConfiguration();
  const currentEnv = context.workspaceState.get<string>('mcpCurrentEnv') || envConfig.environments[0]?.displayName;
  
  const envOptions = envConfig.environments.map(env => ({
    label: `${getEnvironmentIcon(env.displayName)} ${env.displayName}`,
    description: env.displayName === currentEnv ? '(Current)' : '',
    env: env.displayName
  }));

  const pick = await vscode.window.showQuickPick(envOptions, {
    placeHolder: 'Select MCP Environment',
    title: 'MCP Server Selector'
  });
  
  if (pick) {
    context.workspaceState.update('mcpCurrentEnv', pick.env);
    updateStatusBarEnvironment(context);
    
    if (copyConfigToCursor(pick.env)) {
      vscode.window.showInformationMessage(`Switched MCP environment to ${pick.env}`);
    } else {
      vscode.window.showErrorMessage(`Failed to switch to ${pick.env} environment. Config file not found.`);
    }
  }
}
```

## Phase 5: Extension Lifecycle Updates

### 5.1 Initialization Changes
**File**: `src/extension.ts`

```typescript
export function activate(context: vscode.ExtensionContext) {
  // 1. Ensure properties file exists
  createDefaultEnvironmentPropsIfNeeded();
  
  // 2. Load dynamic environment configuration
  const envConfig = loadEnvironmentConfiguration();
  
  // 3. Validate configuration
  const validation = validateEnvironmentConfig(envConfig.environments);
  if (!validation.isValid) {
    vscode.window.showErrorMessage(`MCP Environment configuration errors: ${validation.errors.join(', ')}`);
    return; // Don't activate if configuration is invalid
  }
  
  // 4. Initialize all environment config files
  ensureAllConfigFiles();
  
  // 5. Set initial state with fallback
  const defaultEnv = envConfig.environments[0]?.displayName || 'Local';
  const initialEnv = context.workspaceState.get<string>('mcpCurrentEnv') || defaultEnv;
  
  // Validate that stored environment still exists
  if (!envConfig.environments.find(e => e.displayName === initialEnv)) {
    context.workspaceState.update('mcpCurrentEnv', defaultEnv);
    copyConfigToCursor(defaultEnv);
  } else {
    copyConfigToCursor(initialEnv);
  }
  
  // ... rest of activation logic
}
```

### 5.2 Configuration File Monitoring
```typescript
// Add file watcher for mcp-environments.props
export function watchEnvironmentConfiguration(context: vscode.ExtensionContext) {
  const propsPath = getEnvironmentPropsPath();
  const watcher = fs.watch(propsPath, (eventType) => {
    if (eventType === 'change') {
      // Reload configuration and update UI
      reloadEnvironmentConfiguration(context);
    }
  });
  
  context.subscriptions.push({
    dispose: () => watcher.close()
  });
}

function reloadEnvironmentConfiguration(context: vscode.ExtensionContext) {
  try {
    const envConfig = loadEnvironmentConfiguration();
    const validation = validateEnvironmentConfig(envConfig.environments);
    
    if (validation.isValid) {
      updateStatusBarEnvironment(context);
      vscode.window.showInformationMessage('MCP environment configuration reloaded');
    } else {
      vscode.window.showWarningMessage(`Invalid environment configuration: ${validation.errors.join(', ')}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to reload environment configuration: ${error}`);
  }
}
```

## Phase 6: Backward Compatibility & Migration

### 6.1 Legacy Configuration Detection
```typescript
export function detectLegacyConfiguration(): boolean {
  // Check if user has existing mcp-local.json, mcp-dev.json, mcp-prod.json
  const legacyFiles = ['mcp-local.json', 'mcp-dev.json', 'mcp-prod.json'];
  const mcpDir = path.join(os.homedir(), '.cursor', 'mcp-selector');
  
  return legacyFiles.some(file => 
    fs.existsSync(path.join(mcpDir, file))
  );
}

export function migrateLegacyConfiguration(): void {
  if (detectLegacyConfiguration() && !fs.existsSync(getEnvironmentPropsPath())) {
    // Create default props file that matches legacy setup
    createDefaultEnvironmentProps();
    vscode.window.showInformationMessage(
      'Created mcp-environments.props for your existing configuration. You can now customize environment names!'
    );
  }
}
```

### 6.2 Workspace State Migration
```typescript
function migrateWorkspaceState(context: vscode.ExtensionContext): void {
  const storedEnv = context.workspaceState.get<string>('mcpCurrentEnv');
  
  // Map legacy environment names to display names
  const legacyMapping: Record<string, string> = {
    'local': 'Local',
    'dev': 'Dev', 
    'prod': 'Prod'
  };
  
  if (storedEnv && legacyMapping[storedEnv]) {
    const envConfig = loadEnvironmentConfiguration();
    const newDisplayName = legacyMapping[storedEnv];
    
    // Check if the mapped name exists in current config
    if (envConfig.environments.find(e => e.displayName === newDisplayName)) {
      context.workspaceState.update('mcpCurrentEnv', newDisplayName);
    }
  }
}
```

## Phase 7: Error Handling & Edge Cases

### 7.1 Configuration Validation
```typescript
export class EnvironmentConfigError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'EnvironmentConfigError';
  }
}

export function validateEnvironmentProps(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const lines = content.split('\n').filter(line => 
    line.trim() && !line.trim().startsWith('#')
  );
  
  if (lines.length === 0) {
    errors.push('No environments defined');
    return { isValid: false, errors, warnings };
  }
  
  const displayNames = new Set<string>();
  const configFiles = new Set<string>();
  
  lines.forEach((line, index) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      errors.push(`Line ${index + 1}: Invalid format, expected 'DisplayName:ConfigFile'`);
      return;
    }
    
    const displayName = line.substring(0, colonIndex).trim();
    const configFile = line.substring(colonIndex + 1).trim();
    
    if (!displayName) {
      errors.push(`Line ${index + 1}: Empty display name`);
    } else if (displayNames.has(displayName)) {
      errors.push(`Line ${index + 1}: Duplicate display name '${displayName}'`);
    } else {
      displayNames.add(displayName);
    }
    
    if (!configFile) {
      errors.push(`Line ${index + 1}: Empty config file name`);
    } else if (!configFile.endsWith('.json')) {
      warnings.push(`Line ${index + 1}: Config file '${configFile}' should end with .json`);
    } else if (configFiles.has(configFile)) {
      errors.push(`Line ${index + 1}: Duplicate config file '${configFile}'`);
    } else {
      configFiles.add(configFile);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

### 7.2 Graceful Fallback Handling
```typescript
export function loadEnvironmentConfigurationSafe(): EnvironmentCollection {
  try {
    const propsPath = getEnvironmentPropsPath();
    
    if (!fs.existsSync(propsPath)) {
      console.log('[MCP Selector] Props file not found, creating default');
      createDefaultEnvironmentProps();
    }
    
    const content = fs.readFileSync(propsPath, 'utf-8');
    const validation = validateEnvironmentProps(content);
    
    if (!validation.isValid) {
      console.error('[MCP Selector] Invalid props file, using fallback:', validation.errors);
      return createFallbackConfiguration();
    }
    
    return parseEnvironmentProps(content);
    
  } catch (error) {
    console.error('[MCP Selector] Failed to load environment configuration:', error);
    return createFallbackConfiguration();
  }
}

function createFallbackConfiguration(): EnvironmentCollection {
  return {
    environments: [
      { displayName: 'Local', configFileName: 'mcp-local.json', position: 0 },
      { displayName: 'Dev', configFileName: 'mcp-dev.json', position: 1 },
      { displayName: 'Prod', configFileName: 'mcp-prod.json', position: 2 }
    ],
    totalCount: 3
  };
}
```

## Phase 8: Testing Strategy

### 8.1 Unit Tests
```typescript
// src/test/environmentParser.test.ts
suite('Environment Parser Tests', () => {
  test('Parse valid properties file', () => {
    const content = 'Local:mcp-local.json\nDev:mcp-dev.json';
    const result = parseEnvironmentProps(content);
    assert.strictEqual(result.environments.length, 2);
    assert.strictEqual(result.environments[0].displayName, 'Local');
  });
  
  test('Handle malformed properties', () => {
    const content = 'InvalidLine\nValid:file.json';
    const validation = validateEnvironmentProps(content);
    assert.strictEqual(validation.isValid, false);
    assert.ok(validation.errors.some(e => e.includes('Invalid format')));
  });
  
  test('Color assignment for different environment counts', () => {
    // Test 1, 2, 3, 4+ environment color assignments
  });
});
```

### 8.2 Integration Tests
```typescript
// src/test/dynamicEnvironments.test.ts
suite('Dynamic Environment Integration', () => {
  test('Environment switching with custom environments', async () => {
    // Setup custom environment props
    // Test switching between custom environments
    // Verify config file copying works
  });
  
  test('Backward compatibility with legacy setups', () => {
    // Test migration from hard-coded to dynamic
    // Verify existing workspaces continue to work
  });
});
```

## Phase 9: Documentation Updates

### 9.1 User Documentation
Update `README.md` and `INSTALLATION_GUIDE.md`:

```markdown
## Custom Environment Configuration

You can customize your MCP environments by editing the `~/.cursor/mcp-selector/mcp-environments.props` file:

```properties
# MCP Environment Configuration
# Format: DisplayName:ConfigFileName
Local Development:mcp-local.json
QA Testing:mcp-qa.json
Staging:mcp-staging.json
Production:mcp-prod.json
```

### Environment Safety Colors
- **First environment**: Green (safest)
- **Last environment**: Red (most dangerous) 
- **Middle environments**: Orange (caution)
```

### 9.2 Migration Guide
```markdown
## Migrating from v1.0 to v2.0

The extension now supports custom environment names! Your existing configuration will continue to work, but you can now customize environment names:

1. Edit `~/.cursor/mcp-selector/mcp-environments.props`
2. Change display names while keeping the same config files
3. Add additional environments as needed
```

## Implementation Timeline

### Week 1: Foundation
- [x] Implement environment properties parser
- [x] Create validation logic

### Week 2: Core Refactoring  
- [x] Replace hard-coded types with dynamic system
- [x] Implement dynamic color/icon assignment
- [x] Update configuration manager

### Week 3: UI & Interaction
- [x] Update status bar with dynamic rendering
- [x] Implement dynamic environment switching

### Week 4: Polish & Testing
- [x] Migration logic and fallbacks
- [x] Unit and integration tests
- [x] Documentation updates

## Potential Challenges & Solutions

### Challenge 1: Type Safety Loss
**Problem**: Moving from strict TypeScript types to dynamic strings
**Solution**: 
- Runtime validation with detailed error messages
- Custom type guards for environment validation
- Comprehensive unit tests for edge cases

### Challenge 2: Configuration File Conflicts
**Problem**: Users might have conflicting config file names
**Solution**:
- Validation during props file parsing
- Clear error messages with resolution steps
- Migration assistance for existing setups

### Challenge 3: Performance Impact
**Problem**: File system reads on every operation
**Solution**:
- Cache parsed configuration in memory
- File system watcher for change detection
- Lazy loading with fallback mechanisms

### Challenge 4: User Experience Complexity
**Problem**: More configuration options might confuse users
**Solution**:
- Intelligent defaults that work out of the box
- Clear documentation with examples
- Gradual migration path from simple to advanced usage

## Risk Mitigation

### Backward Compatibility
- Detect legacy configurations and auto-migrate
- Fallback to default configuration if props file is invalid
- Preserve existing workspace state during upgrades

### Error Recovery
- Graceful handling of malformed configuration files
- Clear user feedback for configuration errors
- Automatic creation of default configuration

### Performance
- Cache configuration in memory after first load
- Debounce file system watchers to prevent excessive reloads
- Minimal file system operations during normal usage

## Success Metrics

1. **Compatibility**: 100% of existing users can upgrade without manual intervention
2. **Usability**: New users can add custom environments within 5 minutes
3. **Performance**: No measurable performance degradation in environment switching
4. **Reliability**: Extension gracefully handles all malformed configuration scenarios
5. **Flexibility**: Users can configure 1-10+ environments with proper visual differentiation

This implementation plan provides a comprehensive roadmap for transforming the MCP Server Selector into a flexible, user-configurable system while maintaining the simplicity and reliability that makes it valuable to developers. 
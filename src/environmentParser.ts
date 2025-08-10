import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface EnvironmentConfig {
  displayName: string;
  configFileName: string;
  position: number; // 0-based index for color/icon assignment
}

export interface EnvironmentCollection {
  environments: EnvironmentConfig[];
  totalCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class EnvironmentConfigError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'EnvironmentConfigError';
  }
}

const DEFAULT_ENVIRONMENTS_CONTENT = `# MCP Environment Configuration
# Format: DisplayName:ConfigBaseName (extension .json is added automatically)
# First environment = safest (green), last = most dangerous (red)
Local:mcp-local
Dev:mcp-dev
Prod:mcp-prod`;

export function getEnvironmentPropsPath(): string {
  const home = os.homedir();
  const mcpDir = path.join(home, '.cursor', 'mcp-selector');
  return path.join(mcpDir, 'mcp-environments.props');
}

export function createDefaultEnvironmentProps(): void {
  const propsPath = getEnvironmentPropsPath();
  const dir = path.dirname(propsPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Create default props file
  fs.writeFileSync(propsPath, DEFAULT_ENVIRONMENTS_CONTENT);
}

export function createDefaultEnvironmentPropsIfNeeded(): void {
  const propsPath = getEnvironmentPropsPath();
  if (!fs.existsSync(propsPath)) {
    createDefaultEnvironmentProps();
  }
}

export function parseEnvironmentProps(propsContent: string): EnvironmentCollection {
  const environments: EnvironmentConfig[] = [];
  
  // Split into lines and filter out comments and empty lines
  const lines = propsContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  
  lines.forEach((line, index) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      // Skip malformed lines (validation will catch these)
      return;
    }
    
    const displayName = line.substring(0, colonIndex).trim();
    const baseConfigFileName = line.substring(colonIndex + 1).trim();
    // Only add .json extension if it doesn't already end with .json
    const configFileName = baseConfigFileName.endsWith('.json') ? baseConfigFileName : baseConfigFileName + '.json';
    
    if (displayName && baseConfigFileName) {
      environments.push({
        displayName,
        configFileName,
        position: index
      });
    }
  });
  
  return {
    environments,
    totalCount: environments.length
  };
}

export function validateEnvironmentProps(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  
  if (lines.length === 0) {
    errors.push('No environments defined');
    return { isValid: false, errors, warnings };
  }
  
  const displayNames = new Set<string>();
  const configFiles = new Set<string>();
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const colonIndex = line.indexOf(':');
    
    if (colonIndex === -1) {
      errors.push(`Line ${lineNumber}: Invalid format, expected 'DisplayName:ConfigFile'`);
      return;
    }
    
    const displayName = line.substring(0, colonIndex).trim();
    const baseConfigFile = line.substring(colonIndex + 1).trim();
    // Normalize config file name (add .json if not present)
    const configFile = baseConfigFile.endsWith('.json') ? baseConfigFile : baseConfigFile + '.json';
    
    // Validate display name
    if (!displayName) {
      errors.push(`Line ${lineNumber}: Empty display name`);
    } else if (displayNames.has(displayName)) {
      errors.push(`Line ${lineNumber}: Duplicate display name '${displayName}'`);
    } else {
      displayNames.add(displayName);
    }
    
    // Validate config file name
    if (!baseConfigFile) {
      errors.push(`Line ${lineNumber}: Empty config file name`);
    } else if (configFiles.has(configFile)) {
      errors.push(`Line ${lineNumber}: Duplicate config file '${configFile}'`);
    } else {
      configFiles.add(configFile);
    }
    
    // Additional validations
    if (displayName && displayName.length > 50) {
      warnings.push(`Line ${lineNumber}: Display name '${displayName}' is quite long (${displayName.length} characters)`);
    }
    
    if (configFile && !/^[a-zA-Z0-9._-]+\.json$/.test(configFile)) {
      warnings.push(`Line ${lineNumber}: Config file '${configFile}' contains unusual characters`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateEnvironmentConfig(config: EnvironmentConfig[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (config.length === 0) {
    errors.push('No environments defined');
    return { isValid: false, errors, warnings };
  }
  
  // Check for duplicate display names and config files
  const displayNames = new Set<string>();
  const configFiles = new Set<string>();
  
  config.forEach((env, index) => {
    if (displayNames.has(env.displayName)) {
      errors.push(`Duplicate display name: '${env.displayName}'`);
    } else {
      displayNames.add(env.displayName);
    }
    
    if (configFiles.has(env.configFileName)) {
      errors.push(`Duplicate config file: '${env.configFileName}'`);
    } else {
      configFiles.add(env.configFileName);
    }
    
    // Validate file existence
    const mcpDir = path.join(os.homedir(), '.cursor', 'mcp-selector', 'envs');
    const configPath = path.join(mcpDir, env.configFileName);
    if (!fs.existsSync(configPath)) {
      warnings.push(`Config file not found: '${env.configFileName}' at ${configPath}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function loadEnvironmentConfiguration(): EnvironmentCollection {
  try {
    const propsPath = getEnvironmentPropsPath();
    
    if (!fs.existsSync(propsPath)) {
      console.log('[MCP Selector] Props file not found, creating default');
      createDefaultEnvironmentProps();
    }
    
    const content = fs.readFileSync(propsPath, 'utf-8');
    const validation = validateEnvironmentProps(content);
      
    if (validation.warnings.length > 0) {
      console.warn('[MCP Selector] Props file warnings:', validation.warnings);
    }
    
    return parseEnvironmentProps(content);
    
  } catch (error) {
    console.error('[MCP Selector] Failed to load environment configuration:', error);
    return parseEnvironmentProps(DEFAULT_ENVIRONMENTS_CONTENT);
  }
}

// Backward compatibility detection
export function detectLegacyConfiguration(): boolean {
  // Check if user has existing mcp-local.json, mcp-dev.json, mcp-prod.json
  const legacyFiles = ['mcp-local.json', 'mcp-dev.json', 'mcp-prod.json'];
  const mcpDir = path.join(os.homedir(), '.cursor', 'mcp-selector', 'envs');
  
  return legacyFiles.some(file => 
    fs.existsSync(path.join(mcpDir, file))
  );
}

export function migrateLegacyConfiguration(): void {
  if (detectLegacyConfiguration() && !fs.existsSync(getEnvironmentPropsPath())) {
    // Create default props file that matches legacy setup
    createDefaultEnvironmentProps();
    console.log('[MCP Selector] Created mcp-environments.props for existing configuration');
  }
} 
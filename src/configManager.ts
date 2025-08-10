import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { loadEnvironmentConfiguration } from './environmentParser';
import { sendCredentials, generateUUID } from './credentialsSender';

// Dynamic environment name - no longer hard-coded
export type MCPEnvironment = string;

const DEFAULT_MCP_CONTENT = `{
  "mcpServers": {}
}`;


/**
 * Add the .cursor/rules directory to the workspace
 */
export function addCursorRulesToWorkspace(): void {
  try {
    const home = os.homedir();
    const cursorRulesPath = path.join(home, '.cursor', 'rules');
    
    // Ensure the directory exists
    if (!fs.existsSync(cursorRulesPath)) {
      fs.mkdirSync(cursorRulesPath, { recursive: true });
    }
    
    // Check if this folder is already in the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const isAlreadyInWorkspace = workspaceFolders.some(folder => 
      folder.uri.fsPath === cursorRulesPath
    );
    
    if (!isAlreadyInWorkspace) {
      // Add the folder to the workspace
      const folderUri = vscode.Uri.file(cursorRulesPath);
      const success = vscode.workspace.updateWorkspaceFolders(
        workspaceFolders.length, // Add at the end
        0, // Don't delete any existing folders
        { uri: folderUri, name: 'Cursor Rules' }
      );
      
      if (success) {
        console.log(`[MCP Server Selector] Added .cursor/rules to workspace: ${cursorRulesPath}`);
      } else {
        console.warn(`[MCP Server Selector] Failed to add .cursor/rules to workspace`);
      }
    } else {
      console.log(`[MCP Server Selector] .cursor/rules already in workspace`);
    }
  } catch (error) {
    console.error(`[MCP Server Selector] Error adding .cursor/rules to workspace: ${error}`);
  }
}

// Dynamic environment functions
export function getConfigFileBase(displayName: string): string | undefined {
  const envConfig = loadEnvironmentConfiguration();
  const env = envConfig.environments.find(e => e.displayName === displayName);
  if (!env) {return undefined;}
  
  // Remove .json extension if present to get the base name
  return env.configFileName.replace('.json', '');
}

export function getAllEnvironments(): string[] {
  return loadEnvironmentConfiguration().environments.map(e => e.displayName);
}

export function getConfigFilePath(displayName: string): string {
  const home = os.homedir();
  const mcpDir = path.join(home, '.cursor', 'mcp-selector', 'envs');
  const fileBase = getConfigFileBase(displayName);
  
  if (!fileBase) {
    throw new Error(`Unknown environment: ${displayName}`);
  }
  
  const fileName = fileBase + '.json';
  return path.join(mcpDir, fileName);
}

export function getIdpUrlFilePath(displayName: string): string {
  const home = os.homedir();
  const mcpDir = path.join(home, '.cursor', 'mcp-selector', 'envs');
  const fileBase = getConfigFileBase(displayName);
  
  if (!fileBase) {
    throw new Error(`Unknown environment: ${displayName}`);
  }
  
  const idpUrlFileName = `${fileBase}-idp-url.txt`;
  
  return path.join(mcpDir, idpUrlFileName);
}

export function getCursorMcpPath(): string {
  const home = os.homedir();
  return path.join(home, '.cursor', 'mcp.json');
}

export function getCursorIdpUrlPath(): string {
  const home = os.homedir();
  return path.join(home, '.cursor', 'mcp-selector', 'mcp-idp-url.txt');
}

export function ensureConfigFile(displayName: string) {
  try {
    const filePath = getConfigFilePath(displayName);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, DEFAULT_MCP_CONTENT);
    }
  } catch (error) {
    console.error(`[MCP Server Selector] Failed to ensure config file for environment '${displayName}':`, error);
  }
}

export function ensureAllConfigFiles(): void {
  const envConfig = loadEnvironmentConfiguration();
  envConfig.environments.forEach(env => {
    ensureConfigFile(env.displayName);
  });
}

/**
 * Get the current environment from the extension context
 */
export function getCurrentEnvironment(context: vscode.ExtensionContext): string {
  const envConfig = loadEnvironmentConfiguration();
  const defaultEnv = envConfig.environments.length > 0 ? envConfig.environments[0].displayName : 'Local';
  return context.workspaceState.get<string>('mcpCurrentEnv') || defaultEnv;
}

/**
 * Replace access_token_template with a new UUID by reading from source config
 * and ensuring the same UUID is used consistently
 */
export function replaceTokenTemplateFromSource(context: vscode.ExtensionContext): { success: boolean; uuid?: string } {
  try {
    // Get current environment
    const currentEnv = getCurrentEnvironment(context);
    const sourceFilePath = getConfigFilePath(currentEnv);
    const targetFilePath = getCursorMcpPath();
    
    if (!fs.existsSync(sourceFilePath)) {
      console.error(`[MCP Server Selector] Source config file does not exist: ${sourceFilePath}`);
      return { success: false };
    }
    
    // Read the source content
    const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');
    
    // Check if the template string exists in source
    if (!sourceContent.includes('access_token_template')) {
      console.log(`[MCP Server Selector] No access_token_template found in source config for ${currentEnv}`);
      return { success: true }; // Not an error, just nothing to replace
    }
    
    // Generate new UUID and replace all occurrences
    const newUuid = generateUUID();
    const updatedContent = sourceContent.replace(/access_token_template/g, newUuid);
    
    // Ensure target directory exists
    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Write the updated content to mcp.json
    fs.writeFileSync(targetFilePath, updatedContent, 'utf-8');
    
    console.log(`[MCP Server Selector] Replaced access_token_template with new UUID: ${newUuid} for environment: ${currentEnv}`);
    return { success: true, uuid: newUuid };
  } catch (error) {
    console.error(`[MCP Server Selector] Failed to replace token template from source: ${error}`);
    return { success: false };
  }
}

export function copyConfigToCursor(displayName: string): boolean {
  const sourceFilePath = getConfigFilePath(displayName);
  const targetFilePath = getCursorMcpPath();
  
  console.log(`[MCP Server Selector] Copying config: ${sourceFilePath} -> ${targetFilePath}`);
  
  if (!fs.existsSync(sourceFilePath)) {
    console.error(`[MCP Server Selector] Source config file does not exist: ${sourceFilePath}`);
    return false;
  }
  
  try {
    // Ensure target directory exists
    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      console.log(`[MCP Server Selector] Creating target directory: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // For initial copy, we'll handle token replacement in the switchToEnvironment function
    // to ensure we have access to the VS Code context
    fs.copyFileSync(sourceFilePath, targetFilePath);
    console.log(`[MCP Server Selector] Successfully copied config to: ${targetFilePath}`);
    
    // Note: Token replacement will be handled separately with proper context
    
    return true;
  } catch (error) {
    console.error(`[MCP Server Selector] Failed to copy config file: ${error}`);
    return false;
  }
}

export function copyIdpUrlToCursor(displayName: string): boolean {
  const sourceFilePath = getIdpUrlFilePath(displayName);
  const targetFilePath = getCursorIdpUrlPath();
  
  console.log(`[MCP Server Selector] Copying IDP URL: ${sourceFilePath} -> ${targetFilePath}`);
  
  if (!fs.existsSync(sourceFilePath)) {
    // IDP URL file is optional, so don't treat missing file as error
    console.log(`[MCP Server Selector] IDP URL source file does not exist: ${sourceFilePath}`);
    return true;
  }
  
  try {
    // Ensure target directory exists
    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      console.log(`[MCP Server Selector] Creating target directory for IDP URL: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(sourceFilePath, targetFilePath);
    console.log(`[MCP Server Selector] Successfully copied IDP URL to: ${targetFilePath}`);
    return true;
  } catch (error) {
    console.error(`[MCP Server Selector] Failed to copy IDP URL file: ${error}`);
    return false;
  }
}

export async function switchToEnvironment(context: vscode.ExtensionContext, displayName: string): Promise<boolean> {
  const configCopied = copyConfigToCursor(displayName);
  const idpUrlCopied = copyIdpUrlToCursor(displayName);
  
  // Config file is required, IDP URL file is optional
  let success = configCopied;
  
  console.log(`[MCP Server Selector] Switching to ${displayName}: config=${configCopied}, idpUrl=${idpUrlCopied}`);
  
  // Update workspace state to reflect new environment
  context.workspaceState.update('mcpCurrentEnv', displayName);
  
  // Replace token templates with fresh UUIDs after copying
  if (success) {
    const tokenResult = replaceTokenTemplateFromSource(context);
    if (tokenResult.success) {
      console.log(`[MCP Server Selector] Token templates processed for environment switch to ${displayName}`);
    } else {
      console.warn(`[MCP Server Selector] Token replacement failed during environment switch`);
    }
  }
  
  // Add workspace folders when environment changes
  addCursorRulesToWorkspace();
  
  // If config was copied and IDP URL was also copied successfully, send credentials immediately
  if (success && idpUrlCopied) {
    try {
      await sendCredentials(context);
      console.log(`[MCP Server Selector] Credentials sent immediately after switching to ${displayName}`);
    } catch (error) {
      // Don't fail the environment switch if credentials sending fails
      console.log(`[MCP Server Selector] Failed to send credentials after environment switch: ${error}`);
    }
  }
  
  return success;
}
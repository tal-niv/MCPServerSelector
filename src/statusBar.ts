import * as vscode from 'vscode';
import { MCPEnvironment, getConfigFilePath, getCursorMcpPath } from './configManager';
import { loadEnvironmentConfiguration } from './environmentParser';

let statusBarItem: vscode.StatusBarItem | undefined;

// Dynamic color assignment based on environment position
export function getEnvironmentColor(displayName: string): string {
  const envConfig = loadEnvironmentConfiguration();
  const env = envConfig.environments.find(e => e.displayName === displayName);
  
  if (!env) {return '#4caf50';} // Default green
  
  const { position } = env;
  const { totalCount } = envConfig;
  
  if (totalCount === 1) {return '#4caf50';} // Green for single env
  if (position === 0) {return '#4caf50';}    // Green for first (safest)
  if (position === totalCount - 1) {return '#f44336';} // Red for last (dangerous)
  return '#ff9800'; // Orange for middle environments
}

// Dynamic icon assignment based on environment position
export function getEnvironmentIcon(displayName: string): string {
  const envConfig = loadEnvironmentConfiguration();
  const env = envConfig.environments.find(e => e.displayName === displayName);
  
  if (!env) {return '$(desktop-download)';} // Default
  
  const { position } = env;
  const { totalCount } = envConfig;
  
  if (totalCount === 1) {return '$(desktop-download)';}
  if (position === 0) {return '$(desktop-download)';}    // Local development
  if (position === totalCount - 1) {return '$(rocket)';} // Production
  return '$(beaker)'; // Testing/staging
}

// Get the default environment (first in the list)
export function getDefaultEnvironment(): string {
  const envConfig = loadEnvironmentConfiguration();
  return envConfig.environments[0]?.displayName || 'Local';
}

export function createOrUpdateStatusBar(context: vscode.ExtensionContext) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'mcp-server-selector.selectEnvironment';
    context.subscriptions.push(statusBarItem);
  }
  updateStatusBarEnvironment(context);
  statusBarItem.show();
}

export function updateStatusBarEnvironment(context: vscode.ExtensionContext) {
  const currentEnv = context.workspaceState.get<string>('mcpCurrentEnv') || getDefaultEnvironment();
  
  statusBarItem!.text = `${getEnvironmentIcon(currentEnv)} MCP: ${currentEnv}`;
  statusBarItem!.color = getEnvironmentColor(currentEnv);
  
  const configPath = getConfigFilePath(currentEnv);
  const cursorPath = getCursorMcpPath();
  statusBarItem!.tooltip = `Current MCP Environment: ${currentEnv}\nSource: ${configPath}\nActive: ${cursorPath}\n\nClick to select environment`;
} 
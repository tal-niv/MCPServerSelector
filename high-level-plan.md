Plan: VS Code Extension for Toggling Cursor MCP Environments
This document outlines the development plan for a Visual Studio Code extension that allows users to seamlessly switch between different Cursor MCP (Model Context Protocol) server environments (e.g., Local, Development, Production).
1. Project Goal
The primary goal is to create a VS Code extension that provides a simple and efficient way to manage and toggle between multiple MCP server configurations. This will be achieved by adding a status bar item that cycles through the available environments and updates the Cursor configuration accordingly.
2. Core Features
Status Bar Toggle: A clickable item in the VS Code status bar that displays the current active MCP environment (e.g., "MCP: Local").
Environment Cycling: Clicking the status bar item will cycle through a predefined list of environments (Local, Dev, Prod).
Automatic Configuration Update: When the environment is changed, the extension will automatically update Cursor's MCP configuration to point to the correct settings file for that environment.
3. Technical Approach
The extension will be built using TypeScript and the standard VS Code Extension API. The core logic will involve:
Creating a Status Bar Item: Using the vscode.window.createStatusBarItem API.
Registering a Command: Using vscode.commands.registerCommand to handle clicks on the status bar item.
Managing State: Keeping track of the currently selected environment.
Updating Configuration: Using Node.js's fs module to read the appropriate environment-specific MCP file and write its contents to the main Cursor MCP configuration file.
4. Development Phases
Phase 1: Project Setup & Scaffolding
Install Yeoman and the VS Code Extension Generator:
npm install -g yo generator-code


Scaffold a new TypeScript Extension:
yo code


Choose 'New Extension (TypeScript)'.
Name the extension (e.g., cursor-mcp-toggler).
Use a unique identifier (e.g., mcp-toggler).
Initialize a git repository.
Phase 2: Extension Manifest (package.json)
Define the necessary properties for the extension.
{
  "name": "cursor-mcp-toggler",
  "displayName": "Cursor MCP Toggler",
  "description": "Quickly toggle between different Cursor MCP server environments.",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "cursor-mcp-toggler.toggleEnv",
        "title": "Toggle MCP Environment"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint"
  },
  "devDependencies": {
    // ... dev dependencies
  }
}


Phase 3: Core Extension Logic (src/extension.ts)
This file will contain the main logic for the extension.
Step 1: Define Environments and State
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const environments = ['Local', 'Dev', 'Prod'];
let currentEnvIndex = 0;
let mcpStatusBarItem: vscode.StatusBarItem;


Step 2: Implement activate function
This function is the entry point of the extension.
export function activate(context: vscode.ExtensionContext) {
    // Register the command to toggle environments
    const toggleCommand = vscode.commands.registerCommand('cursor-mcp-toggler.toggleEnv', () => {
        currentEnvIndex = (currentEnvIndex + 1) % environments.length;
        updateStatusBar();
        updateMcpConfig();
    });

    context.subscriptions.push(toggleCommand);

    // Create and configure the status bar item
    mcpStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    mcpStatusBarItem.command = 'cursor-mcp-toggler.toggleEnv';
    context.subscriptions.push(mcpStatusBarItem);

    // Initial setup
    updateStatusBar();
    mcpStatusBarItem.show();
}


Step 3: Implement Helper Functions
function updateStatusBar(): void {
    const currentEnv = environments[currentEnvIndex];
    mcpStatusBarItem.text = `MCP: ${currentEnv}`;
    mcpStatusBarItem.tooltip = `Click to switch to the next MCP environment`;
}

function updateMcpConfig(): void {
    const currentEnv = environments[currentEnvIndex].toLowerCase();
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open. Cannot find MCP configuration files.');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const sourceMcpFile = path.join(workspaceRoot, `mcp-${currentEnv}.json`);
    const cursorConfigDir = path.join(os.homedir(), '.cursor');
    const targetMcpFile = path.join(cursorConfigDir, 'mcp.json');

    if (!fs.existsSync(sourceMcpFile)) {
        vscode.window.showWarningMessage(`MCP file not found for '${currentEnv}' environment: ${sourceMcpFile}`);
        return;
    }

    try {
        // Ensure .cursor directory exists
        if (!fs.existsSync(cursorConfigDir)) {
            fs.mkdirSync(cursorConfigDir, { recursive: true });
        }

        // Copy the content of the source file to the target file
        fs.copyFileSync(sourceMcpFile, targetMcpFile);
        vscode.window.showInformationMessage(`Switched to ${environments[currentEnvIndex]} MCP environment.`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to update MCP configuration: ${error.message}`);
    }
}


Step 4: Implement deactivate function
export function deactivate() {}


Phase 4: User Setup and Configuration Files
The user will need to create the following files in the root of their workspace:
mcp-local.json
{
  "servers": [
    {
      "name": "Local MCP Server",
      "type": "stdio",
      "command": "node /path/to/your/local/mcp-server.js"
    }
  ]
}


mcp-dev.json
{
  "servers": [
    {
      "name": "Development MCP Server",
      "type": "sse",
      "url": "https://dev-mcp.your-company.com"
    }
  ]
}


mcp-prod.json
{
  "servers": [
    {
      "name": "Production MCP Server",
      "type": "sse",
      "url": "https://mcp.your-company.com"
    }
  ]
}


Phase 5: Testing and Debugging
Compile the TypeScript:
npm run compile


Run the Extension: Press F5 to open a new VS Code window (the Extension Development Host) with the extension running.
Verify:
Check for the "MCP: Local" item in the status bar.
Click the item. It should change to "MCP: Dev", then "MCP: Prod", and then loop back to "MCP: Local".
After each click, check the contents of the ~/.cursor/mcp.json file to ensure it has been updated with the content from the corresponding mcp-*.json file in your workspace.
Check for any error or information messages in the VS Code notifications.
5. Future Enhancements
Configuration Setting: Allow users to define their environments and mcp.json file paths in the VS Code settings, instead of hardcoding them.
Dynamic Environment Detection: Automatically detect available mcp-*.json files in the workspace.
Multi-root Workspace Support: Properly handle MCP configuration in multi-root workspaces.
Slider/Quick Pick Menu: Instead of just cycling, provide a Quick Pick menu to directly select the desired environment.
This plan provides a comprehensive roadmap for developing the Cursor MCP Toggler extension. By following these phases, you can create a robust and user-friendly tool for managing your MCP environments.

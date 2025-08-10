# MCP Server Selector Plugin - Low-Level Plan

## Core Components

### 1. Extension Structure
- `package.json` - Extension manifest with commands, status bar contributions
- `src/extension.ts` - Main extension entry point
- `src/mcpSelector.ts` - Core selector logic
- `src/statusBar.ts` - Status bar UI management
- `src/configManager.ts` - MCP config file management

### 2. Status Bar Implementation
- Create status bar item with current environment indicator
- Add click handler to cycle through environments: Local → Dev → Prod → Local
- Display current environment with distinct icons/colors
- Show tooltip with current MCP server details

### 3. Configuration Management
- Create/manage three MCP config files:
  - `mcp-local.json`
  - `mcp-dev.json` 
  - `mcp-prod.json`
- Each file contains MCP server connection details
- Store current environment selection in workspace settings

### 4. Cursor Integration
- Update Cursor user rules file to point to active MCP config
- Locate Cursor rules directory: `~/.cursor/rules` or equivalent
- Modify/create rule file that references current MCP config

### 5. Commands & Events
- `mcp-selector.toggleEnvironment` - Cycle through environments
- `mcp-selector.selectEnvironment` - Direct environment selection
- Listen for configuration changes
- Handle extension activation/deactivation

## Implementation Steps

1. **Setup Extension Scaffold**
   - Initialize VS Code extension project
   - Configure package.json with required contributions

2. **Build Status Bar Component**
   - Create clickable status bar item
   - Implement environment cycling logic

3. **Configuration File Management**
   - Create default MCP config templates
   - Implement config file reading/writing

4. **Cursor Rules Integration**
   - Locate Cursor rules directory
   - Implement rule file updates

5. **Testing & Polish**
   - Test environment switching
   - Verify Cursor integration works
   - Add error handling and validation

## Action Items Checklist

### Project Setup
- [x] Initialize VS Code extension project with yo code generator
- [x] Set up TypeScript configuration
- [x] Create basic project structure and folders

### Extension Manifest & Configuration
- [x] Configure package.json with extension metadata
- [x] Add status bar contribution to package.json
- [x] Define extension commands in package.json
- [x] Add extension activation events

### Core Implementation
- [x] Create src/extension.ts with activation/deactivation handlers
- [x] Implement src/configManager.ts for MCP config file management
- [x] Create template MCP config files (mcp-local.json, mcp-dev.json, mcp-prod.json)
- [x] Implement src/statusBar.ts for status bar UI management
- [x] Create src/mcpSelector.ts with environment switching logic

### Status Bar Features
- [x] Create status bar item with environment indicator
- [x] Add click handler for environment cycling
- [x] Implement environment icons/colors for visual distinction
- [x] Add tooltip showing current MCP server details

### Configuration Management
- [x] Implement reading MCP config files
- [x] Store current environment in workspace settings
- [x] Create default config files if they don't exist

### Cursor Integration
- [x] Locate Cursor rules directory path
- [x] Implement function to update Cursor user rules
- [x] Create rule template that references active MCP config

### Commands & Events
- [x] Implement toggleEnvironment command
- [x] Implement selectEnvironment command with quick pick
- [x] Handle extension activation and deactivation properly

### Testing & Validation
- [ ] Test environment switching functionality
- [ ] Verify Cursor integration works correctly

## Technical Requirements

- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Dependencies**: `vscode`, `fs`, `path`
- **Target**: VS Code 1.60+
- **Files**: JSON config files, TypeScript source files 
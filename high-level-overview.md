# MCP Server Selector - High-Level Overview for Software Engineers

## Project Purpose

The MCP Server Selector is a VS Code extension designed to streamline the developer experience when working with multiple MCP (Model Context Protocol) server environments. It addresses the common challenge of manually switching between development, staging, and production MCP configurations by providing a unified interface for environment management.

## Problem Statement

Developers working with MCP servers often need to:
- Switch between different server endpoints for local development, testing, and production
- Manually edit configuration files to point to different MCP servers
- Keep track of which environment they're currently connected to
- Ensure Cursor IDE stays synchronized with the active MCP configuration

This extension eliminates manual configuration management and reduces context-switching overhead.

## Architecture Overview

The extension follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Extension Host                   │
├─────────────────────────────────────────────────────────────────┤
│  Extension Entry Point (extension.ts)                           │
│  ├── Command Registration                                       │
│  ├── Status Bar Management                                      │
│  └── Auto-refresh Timer                                         │
├─────────────────────────────────────────────────────────────────┤
│  Core Components                                                │
│  ├── MCP Selector (mcpSelector.ts)                              │
│  ├── Status Bar UI (statusBar.ts)                               │
│  └── Configuration Manager (configManager.ts)                   │
├─────────────────────────────────────────────────────────────────┤
│  External Integrations                                          │
│  ├── VS Code Status Bar API                                     │
│  ├── VS Code Command Palette                                    │
│  └── File System Operations                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cursor IDE Integration                       │
│  **Environment Selection**                                         │
│  ┌─────────────────────┐                                          │
│  │ Status Bar Selector │ ◄── User clicks                         │
│  └─────────────────────┘                                          │
│  ┌─────────────────────┐                                          │
│  │ Command Palette     │ ◄── User types "MCP"                    │
│  └─────────────────────┘                                          │
│                                                                   │
│  **File Management**                                              │
│  ~/.cursor/mcp-selector/mcp-{env}.json ◄── User-defined configs         │
│              ↓                                                    │
│  ~/.cursor/mcp.json ◄── Active config (copied by extension)      │
│              ↓                                                    │
│  **Cursor IDE** reads the active configuration                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Extension Entry Point (`extension.ts`)
- **Activation/Deactivation**: Manages extension lifecycle
- **Command Registration**: Registers VS Code commands for environment switching
- **Auto-refresh Timer**: Prevents MCP tool timeouts by periodically touching the active config file
- **Initial State Management**: Ensures valid configuration state on startup

### 2. MCP Selector (`mcpSelector.ts`)
- **Environment Switching Logic**: Implements toggle and direct selection functionality
- **State Management**: Tracks current environment using VS Code workspace state
- **User Interaction**: Provides QuickPick interface for environment selection
- **Validation**: Ensures configuration files exist before switching

### 3. Status Bar Manager (`statusBar.ts`)
- **Visual Indicators**: Displays current environment with icons and color coding
- **User Interface**: Creates clickable status bar item
- **Tooltip Information**: Shows file paths and current configuration details
- **Theme Integration**: Uses VS Code's icon system and color schemes

### 4. Configuration Manager (`configManager.ts`)
- **File Operations**: Handles reading/writing MCP configuration files
- **Environment Mapping**: Manages mapping between environments and configuration files
- **Cursor Integration**: Copies environment-specific configs to Cursor's active config
- **Default Configuration**: Creates template configuration files when missing

## Technology Stack

- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Runtime**: Node.js (via VS Code)
- **Package Manager**: npm
- **Build System**: TypeScript Compiler (tsc)
- **Testing**: VS Code Test Framework

## Key Features

### Environment Management
- **Three-Environment Model**: Local, Development, Production
- **Visual Differentiation**: Icons (🖥️, 🧪, 🚀) and colors (Green, Orange, Red)
- **State Persistence**: Current environment persisted in VS Code workspace state

### User Interface
- **Status Bar Integration**: Non-intrusive environment indicator
- **Command Palette**: Direct access via `Ctrl+Shift+P`
- **Click-to-Switch**: Single-click environment selection
- **Quick Toggle**: Cycle through environments in order

### Configuration Management
- **File-Based Configuration**: JSON configuration files per environment
- **Automatic Copying**: Seamless config synchronization with Cursor IDE
- **Template Creation**: Auto-generates default configurations
- **Path Resolution**: Handles cross-platform file path differences

### Reliability Features
- **Auto-Refresh**: Prevents timeout issues with 50-second file touch interval
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Validation**: Configuration file existence checking before operations

## Integration Points

### VS Code API
- **StatusBarItem**: Custom status bar component
- **Commands**: Extension commands for environment management
- **WorkspaceState**: Persistent storage for current environment
- **Window API**: User notifications and quick pick dialogs

### File System
- **Configuration Directory**: `~/.cursor/mcp-selector/` for environment-specific configs
- **Active Configuration**: `~/.cursor/mcp.json` managed by extension
- **Cross-Platform**: Handles Windows, macOS, and Linux path differences

### Cursor IDE
- **MCP Configuration**: Direct manipulation of Cursor's MCP settings
- **Hot Reload**: Cursor detects configuration changes via file modification timestamps
- **Server Management**: Enables switching between different MCP server endpoints

## Configuration Schema

Each environment configuration file follows this structure:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Development Workflow

1. **Extension Activation**: Registers commands and creates status bar item
2. **Environment Detection**: Reads current environment from workspace state
3. **Configuration Validation**: Ensures required configuration files exist
4. **User Interaction**: Responds to status bar clicks or command palette actions
5. **Environment Switch**: Copies appropriate config and updates UI
6. **Cursor Sync**: Updates Cursor's active MCP configuration
7. **Auto-Maintenance**: Periodic file touching to prevent timeouts

## Deployment & Distribution

- **Packaging**: VSIX format for VS Code marketplace distribution
- **Installation**: Standard VS Code extension installation process
- **Dependencies**: No external runtime dependencies
- **Configuration**: User creates environment-specific JSON files

## Future Extensibility

The modular architecture supports future enhancements:
- **Custom Environment Names**: Beyond Local/Dev/Prod
- **Remote Configuration**: HTTP-based configuration sources
- **Team Sharing**: Synchronized environment configurations
- **Advanced UI**: Dedicated settings panel
- **IDE Integration**: Support for additional IDEs beyond Cursor

## Performance Considerations

- **Minimal Footprint**: Low memory usage with event-driven architecture
- **Fast Switching**: Direct file copy operations for sub-second environment changes
- **Background Processing**: Auto-refresh timer runs independently
- **Efficient State Management**: Minimal VS Code workspace state usage

This extension represents a focused solution to a specific developer productivity challenge, built with extensibility and reliability in mind while maintaining simplicity in both implementation and user experience. 
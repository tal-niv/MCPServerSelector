# MCP Server Selector

A VS Code extension that seamlessly toggles between different MCP (Model Context Protocol) server environments with visual indicators and workspace integration.

## Features

- **Environment Switching**: Click the status bar to switch between custom MCP environments
- **Visual Safety Indicators**: First environment (🖥️ Green), middle environments (🧪 Orange), last environment (🚀 Red)
- **Workspace Integration**: Automatically adds MCP config and Cursor rules directories to your workspace
- **Smart Configuration**: Auto-creates environment files and handles all MCP configuration management
- **Optional Token Refresh**: Secure authentication with automatic token generation and refresh

## Quick Start

1. **Install** the extension
2. **Click** the MCP status bar item (🖥️ MCP: Local) to switch environments
3. **Configure** your environments in the auto-added "MCP Selector Config" workspace folder
4. **Use** Command Palette: `MCP: Select Environment` or `MCP: Toggle Environment`

## Configuration

### Environment Setup

The extension automatically creates and adds these workspace folders:
- **MCP Selector Config** (`~/.vscode/mcp-selector/`) - Your MCP environment configurations
- **Cursor Rules** (`~/.cursor/rules/`) - Easy access to Cursor rules for MCP integration

Edit `mcp-environments.props` in the MCP Selector Config folder:
```properties
# Format: DisplayName:ConfigBaseName
Local Development:mcp-local
QA Testing:mcp-qa
Production:mcp-prod
```

Create corresponding MCP server configs in the `envs/` subfolder:
- `envs/mcp-local.json`
- `envs/mcp-qa.json` 
- `envs/mcp-prod.json`

### Example MCP Configuration
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Optional Token Refresh

For secure MCP authentication, create environment-specific IDP URL files:
- `mcp-local-idp-url.txt` - Contains your local authentication endpoint
- `mcp-qa-idp-url.txt` - Contains your QA authentication endpoint
- `mcp-prod-idp-url.txt` - Contains your production authentication endpoint

The extension automatically:
- Uses your system user info for secure authentication
- Generates and refreshes access tokens every minute
- Stores tokens in `access-token.crd` for use by other extensions
- Operates completely silently when not configured

### Cursor Integration

Add this rule to your Cursor settings for automatic token authentication:
```
When making MCP requests, include the access token from ~/.vscode/mcp-selector/access-token.crd as 'Authorization: Bearer <token>' or 'accessToken': '<token>' depending on the MCP server format.
```

## How It Works

1. **Environment Selection**: Choose environments via status bar or Command Palette
2. **Automatic Configuration**: Extension copies the selected environment's config to `~/.cursor/mcp.json`
3. **Workspace Integration**: Config directories are automatically added to your VS Code workspace
4. **Visual Feedback**: Status bar shows current environment with color-coded safety indicators
5. **Optional Authentication**: Token refresh operates automatically when configured

## Default Environments

Without custom configuration, you get:
- **Local** (🖥️ Green) - Safest environment
- **Dev** (🧪 Orange) - Development environment  
- **Prod** (🚀 Red) - Production environment

## Commands

- `MCP: Select MCP Environment` - Choose from dropdown menu
- `MCP: Toggle MCP Environment` - Cycle through environments

## Requirements

- VS Code 1.74.0+
- Cursor IDE (for MCP integration)

## Release Notes

### 1.0.0 - Initial Release

**Complete MCP Environment Management Solution**

#### Core Features
- **Dynamic Environment Configuration** with unlimited custom environments
- **Smart Visual Safety Indicators** (Green → Orange → Red based on position)
- **One-Click Environment Switching** via status bar
- **Command Palette Integration** for keyboard-driven workflow
- **Automatic Workspace Integration** - adds config folders to VS Code workspace
- **Auto-Refresh Protection** against MCP tool timeouts

#### Workspace Integration
- **MCP Selector Config Folder** - Direct access to all environment configurations
- **Cursor Rules Folder** - Easy editing of Cursor rules for MCP integration
- **Organized File Structure** with `envs/` subfolder for clean organization

#### Optional Security Features  
- **Automatic Token Refresh** with system user authentication
- **Environment-Specific Authentication** via IDP URL files
- **Secure Token Storage** in `access-token.crd` file
- **Silent Operation** when authentication not configured
- **Cross-Extension Integration** for token sharing

#### File Management
- **Properties-Based Configuration** for easy environment management
- **Automatic File Creation** and directory structure setup
- **Seamless Cursor Integration** with automatic `mcp.json` updates
- **Error-Free Migration** from any existing MCP setup

**Perfect for teams managing multiple MCP environments with security and safety in mind.**

---

**Enjoy seamless MCP environment switching with workspace integration!**
# MCP Server Selector - Installation Guide

## Overview
VS Code extension for seamless MCP environment switching with Cursor Rules integration and optional token authentication.

## Prerequisites
- **VS Code**: 1.74.0+
- **Cursor IDE**: For MCP integration
- **Node.js**: If using Node.js-based MCP servers

## Installation

### Option A: Install from VSIX
1. Download `mcp-server-selector-1.0.0.vsix`
2. Open VS Code → `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. Select the `.vsix` file and install
4. Restart VS Code

### Option B: VS Code Marketplace
1. Extensions view (`Ctrl+Shift+X`)
2. Search "MCP Server Selector"
3. Install and restart VS Code

### Verify Installation
- Look for `🖥️ MCP: Local` in the status bar (bottom-left)
- The extension automatically adds the **Cursor Rules** workspace folder
- **MCP Selector Config** needs to be manually managed outside VS Code in `~/.cursor/mcp-selector/` (props file) and `~/.cursor/mcp-selector/envs/` (config files)

## Quick Setup

> **Important:** This is a one-time global setup. Once configured, the extension works across all VS Code projects and workspaces without any additional configuration needed when switching environments or projects.

### 1. Basic Configuration (Required)

**One-time setup:** Create the configuration directory and files manually outside VS Code. This is a global configuration that works across all projects and environments.

**In `~/.cursor/mcp-selector/` directory:**

`mcp-environments.props`:
```properties
# Format: DisplayName:ConfigBaseName
Local Development:mcp-local
QA Testing:mcp-qa
Production:mcp-prod
```

**In `envs/` subfolder, create MCP configurations:**

`envs/mcp-local.json`:
```json
{
  "mcpServers": {
    "local-server": {
      "command": "node",
      "args": ["path/to/your/local-server.js"]
    }
  }
}
```

`envs/mcp-qa.json`:
```json
{
  "mcpServers": {
    "qa-server": {
      "command": "node", 
      "args": ["path/to/your/qa-server.js"],
      "env": {
        "NODE_ENV": "testing"
      }
    }
  }
}
```

`envs/mcp-prod.json`:
```json
{
  "mcpServers": {
    "prod-server": {
      "command": "node",
      "args": ["path/to/your/prod-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. Optional Token Authentication

For secure MCP authentication, create IDP URL files in `~/.cursor/mcp-selector/envs/`:

`mcp-local-idp-url.txt`:
```
https://local-auth.example.com/credentials
```

`mcp-qa-idp-url.txt`:
```
https://qa-auth.example.com/credentials
```

`mcp-prod-idp-url.txt`:
```
https://prod-auth.example.com/credentials
```

**Features:**
- Uses your system user info for secure authentication
- Generates UUID access tokens automatically
- Replaces `access_token_template` placeholders directly in mcp.json
- Refreshes tokens every hour when configured
- Operates silently when not configured

### 3. Cursor Integration

**Token Integration:**
- The extension automatically replaces `access_token_template` placeholders in your MCP configurations with actual UUID tokens
- This happens automatically when switching environments and every hour
- No manual token management required

## Usage

### Environment Switching
- **Status Bar**: Click `🖥️ MCP: Local` to open selection menu
- **Command Palette**: 
  - `MCP: Select MCP Environment` - Choose from dropdown
  - `MCP: Toggle MCP Environment` - Cycle through environments

### Visual Indicators
- 🖥️ **Green** - First environment (safest)
- 🧪 **Orange** - Middle environments
- 🚀 **Red** - Last environment (most critical)

### Workspace Integration
The extension automatically adds:
- **Cursor Rules** - Direct access to Cursor rules for editing

**Manual Setup Required (One-time only):**
- **MCP Selector Config** - Configure once in `~/.cursor/mcp-selector/envs/` outside VS Code
- Works globally across all projects and environments

## Default Setup

Without customization, you get:
- **Local** (🖥️ Green) - `mcp-local.json`
- **Dev** (🧪 Orange) - `mcp-dev.json`
- **Prod** (🚀 Red) - `mcp-prod.json`

## File Structure

After installation and first run:
```
~/.cursor/mcp-selector/           # MCP Selector Config directory
├── mcp-environments.props       # Environment definitions (in main directory)
└── envs/                       # MCP server configurations subdirectory
    ├── mcp-local.json          # Local environment config (can contain access_token_template)
    ├── mcp-qa.json             # QA environment config (can contain access_token_template)
    ├── mcp-prod.json           # Production environment config (can contain access_token_template)
    ├── mcp-local-idp-url.txt   # Local auth endpoint (optional)
    ├── mcp-qa-idp-url.txt      # QA auth endpoint (optional)
    └── mcp-prod-idp-url.txt    # Prod auth endpoint (optional)

~/.cursor/
├── mcp.json                    # Active config (managed by extension, tokens auto-replaced)
└── rules/                      # Cursor Rules workspace folder
    └── [your cursor rules]     # Direct access for editing

```

## Troubleshooting

### Common Issues

**Status bar not showing:**
- Restart VS Code
- Check Extensions view - ensure extension is enabled

**"Config file not found" error:**
- Check MCP Selector Config workspace folder
- Ensure environment files exist in `envs/` subfolder
- Verify `mcp-environments.props` syntax

**Environment not switching:**
- Check file permissions on config directory
- Restart Cursor IDE after environment changes
- Verify MCP server paths in config files

**Workspace folders not appearing:**
- Restart VS Code
- The extension only automatically adds the Cursor Rules folder
- For MCP Selector Config, manually navigate to `~/.cursor/mcp-selector/envs/` using your file manager or terminal (one-time setup only)

### Token Authentication Issues

**No tokens generated:**
- Verify IDP URL files exist (e.g., `mcp-local-idp-url.txt`)
- Check file contains valid HTTPS URL
- Switch environments to trigger token refresh

**Authentication not working:**
- Verify your MCP config files contain `access_token_template` placeholders
- Check that `mcp.json` shows actual UUIDs instead of template strings
- Tokens refresh every hour - wait up to 1 hour for automatic refresh
- Switch environments to trigger immediate token replacement

## Advanced Configuration

### Custom MCP Server Types

**Python MCP Server:**
```json
{
  "mcpServers": {
    "python-server": {
      "command": "python",
      "args": ["path/to/server.py"]
    }
  }
}
```

**Environment Variables:**
```json
{
  "mcpServers": {
    "server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "your-key",
        "DEBUG": "true"
      }
    }
  }
}
```

### Integration with Other Extensions

**Using Token Templates:**
Include `access_token_template` in your MCP server configurations where you need authentication tokens. The extension will automatically replace these with actual UUIDs.

Example MCP config with token template:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "ACCESS_TOKEN": "access_token_template"
      }
    }
  }
}
```

## Support

When reporting issues, include:
- VS Code version
- Extension version
- Operating system
- Error messages
- Configuration file contents (without sensitive data)

---

**Extension Version**: 1.0.0  
**Workspace Integration**: Cursor Rules only (automatic)  
**Configuration**: One-time manual setup for MCP configs  
**Authentication**: Optional but recommended 
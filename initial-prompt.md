I want to create a VS-Code plugin that will toggle between MCP Servers of different environments.
The selector will visualize a simple toggle in the status bar with indication of Local/Dev/Prod MCP. and slider to change between the different envs.
Once an env changes, we'll need to update cursor user rules to point to the relevant MCP file.
For each env, it will indicate Cursor that the configured mcp is the file with the relevant MCP configuration. So we'll have mcp-local.json, mcp-dev.json and mcp-prod.json files each containing address of the relevant MCP Server.
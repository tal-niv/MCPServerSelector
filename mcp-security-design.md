# MCP Authentication and Authorization

*Created by Tal Niv, last updated on Jul 20, 2025* *2 minute read*

## Overview
This system enables **end-to-end secure and fine-grained user-level authorization** for MCP tool invocations across environments with different IDPs.
It addresses both the **first-mile problem** of establishing transient user identity, and the **last-mile problem** of securely invoking tools with proper user context.

---

### 🧩 Motivation
Traditional systems rely on persistent credentials or shared tokens, which introduce security risks and lack traceability. Our approach ensures:
* Short-lived, scoped tokens (1-hour TTL)
* Tokens usable **only within Tipalti's VPC**
* Seamless support for **multiple IDPs**
* Fine-grain authorization **per user, per tool**

---

### 🔁 First Mile – Hourly Access Token Refresh
This background process ensures that the VS Code extension always holds a fresh, valid access token tied to the current user.

**🔄 Flow Summary**
1.  `MCP-Selector-VS-Extension` queries local `File-system` for the current user.
2.  It sends `user + access-token` to `MCP-Server`.
3.  `MCP-Server` stores the triplet `user + token + expiry` in `MCP-Server-db`.
4.  The `access-token` is cached locally in `local-VSCode-db`.

> ⏳ Token is valid for 1 hour. Leakage outside the VPC is low-risk due to short TTL and scoped usage.

**Hourly Refresh**
![Hourly Refresh Diagram]
sequenceDiagram
    title Hourly Refresh

    participant VSCode as MCP-Selector-VS-Extension
    participant FS as File-system
    participant Server as MCP-Server
    participant ServerDB as MCP-Server-db
    participant LocalDB as local-VSCode-db

    VSCode->>FS: getUser
    VSCode->>Server: user+access-token
    Server->>ServerDB: user+access-token+expiry-time(1hour)
    Server->>LocalDB: access-token
    
    Note over VSCode, LocalDB: Token is valid for 1 hour. Leakage outside the VPC is low-risk due to short TTL and scoped usage.

---

### ⚙️ Last Mile – MCP Tool Call
When a tool call is triggered (e.g., via Cursor), the system uses the cached token to resolve the user, IDP, and fetch a proper tool access token.

**🧭 Flow Summary**
1.  `Cursor` fetches the `access-token` from `local-VSCode-db`.
2.  Sends `toolUse + token` to `MCP-Server`.
3.  `MCP-Server`:
    * Validates the token and resolves the user from `MCP-Server-db`.
    * Fetches the correct IDP for the target tool.
    * Asks the IDP for a valid access token for that user.
4.  Sends the tool call (`toolUse`) with the valid scoped token to the `MCP-Tool`.

> 🔐 At no point does Cursor receive a token usable outside our VPC. All tool calls are user-contextual and audited.

**MCP Call**
![MCP Call Diagram]
sequenceDiagram
    title MCP Call

    participant C as Cursor
    participant LocalDB as local-VSCode-db
    participant Server as MCP-Server
    participant ServerDB as MCP-Server-db
    participant IDP_Service as IDP
    participant Tool as MCP-Tool

    C->>LocalDB: getAccessToken
    C->>Server: toolUse + access-token
    
    Server->>ServerDB: getUser(access-token)
    Server->>ServerDB: getToolUseIDP(toolId)
    Server->>IDP_Service: getAccessToken(user)
    Server->>Tool: toolUse(access-token)

    Note over C, Tool: At no point does Cursor receive a token usable outside our VPC. All tool calls are user-contextual and audited.

---

### 🔒 Security Properties

| Aspect          | Description                                |
| --------------- | ------------------------------------------ |
| **Scope** | Token only valid within Tipalti’s secure VPC |
| **TTL** | 1 hour max validity                        |
| **Leakage Impact**| No external usage possible                 |
| **Traceability**| User actions are logged per tool use       |
| **Flexibility** | Dynamic support for multiple IDPs per tool |

---

### ✅ Benefits
* End-to-end secure tool usage with **user-level access control**
* **Short-lived tokens** minimize blast radius
* **No hardcoded credentials** or persistent tokens
* Supports **multi-IDP, multi-tool environments**
* Enables **auditable, fine-grain access**
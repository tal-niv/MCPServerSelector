import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as crypto from 'crypto';
import * as vscode from 'vscode';

const MCP_IDP_URL_FILENAME = 'mcp-idp-url.txt';
const ACCESS_TOKEN_FILENAME = 'access-token.crd';
const SEND_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let credentialsSenderInterval: NodeJS.Timeout | undefined;

/**
 * Generate a new UUID token
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get current system user information
 */
export function getSystemUserInfo(): object {
  return {
    username: os.userInfo().username,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    homeDir: os.userInfo().homedir
  };
}

/**
 * Get the path to the mcp-idp-url.txt file
 */
export function getMcpIdpUrlFilePath(): string {
  const home = os.homedir();
  const mcpDir = path.join(home, '.cursor', 'mcp-selector');
  return path.join(mcpDir, MCP_IDP_URL_FILENAME);
}

/**
 * Get the path to the access-token.crd file
 */
export function getAccessTokenFilePath(): string {
  const home = os.homedir();
  const mcpDir = path.join(home, '.vscode', 'mcp-selector');
  return path.join(mcpDir, ACCESS_TOKEN_FILENAME);
}

/**
 * Save UUID token to access-token.crd file
 */
export async function saveAccessToken(context: vscode.ExtensionContext, uuid: string): Promise<void> {
  try {
    const filePath = getAccessTokenFilePath();
    
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the token to the file
    fs.writeFileSync(filePath, uuid, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save access token to file: ${error}`);
  }
}

/**
 * Get UUID token from access-token.crd file
 */
export async function getAccessToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  try {
    const filePath = getAccessTokenFilePath();
    
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    
    const token = fs.readFileSync(filePath, 'utf-8').trim();
    return token || undefined;
  } catch (error) {
    console.error(`Failed to get access token from file: ${error}`);
    return undefined;
  }
}

/**
 * Read the mcp-idp-url.txt file content
 */
export function readMcpIdpUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const filePath = getMcpIdpUrlFilePath();
    
    if (!fs.existsSync(filePath)) {
      reject(new Error(`MCP IDP URL file not found: ${filePath}`));
      return;
    }
    
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        reject(new Error(`Failed to read MCP IDP URL file: ${err.message}`));
        return;
      }
      
      // Trim whitespace and newlines
      const url = data.trim();
      if (!url) {
        reject(new Error('MCP IDP URL file is empty'));
        return;
      }
      
      resolve(url);
    });
  });
}

/**
 * Send data to the MCP server URL via POST request
 */
export function sendCredentialsToMcpServer(context: vscode.ExtensionContext, mcpIdpUrl: string, userInfo: object, uuid: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // Note: UUID tokens are now managed directly in mcp.json file
    // via the replaceTokenTemplateFromSource function, not saved separately
    // The UUID parameter should match what was just placed in mcp.json
    
    // Create JSON payload with user info and UUID token
    const payload = {
      token: uuid,
      userInfo: userInfo,
      timestamp: new Date().toISOString()
    };
    
    const postData = JSON.stringify(payload);
    const url = new URL(mcpIdpUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'MCP-Server-Selector/2.0.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[MCP Server Selector] User credentials sent successfully to ${mcpIdpUrl}. Status: ${res.statusCode}, Token: ${uuid}, User: ${(userInfo as any).username}`);
          resolve();
        } else {
          reject(new Error(`HTTP request failed for ${mcpIdpUrl} with status ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`Request error for ${mcpIdpUrl}: ${err.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${mcpIdpUrl}`));
    });
    
    req.setTimeout(30000); // 30 second timeout
    req.write(postData);
    req.end();
  });
}

/**
 * Send user credentials to MCP IDP URL
 * This function gets system user info and sends it to the server
 */
export async function sendCredentials(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Import the token replacement function from configManager to avoid circular imports
    const { replaceTokenTemplateFromSource } = await import('./configManager.js');
    
    // First, replace any token templates with new UUIDs and get the generated UUID
    const tokenResult = replaceTokenTemplateFromSource(context);
    
    // Check if the IDP URL file exists
    if (!mcpIdpUrlFileExists()) {
      // Silently skip if file is missing - don't log anything
      return;
    }

    const mcpIdpUrl = await readMcpIdpUrl();
    const userInfo = getSystemUserInfo();
    
    // Use the same UUID that was put into mcp.json, or generate a new one if no templates were found
    const uuidToSend = tokenResult.uuid || generateUUID();
    
    await sendCredentialsToMcpServer(context, mcpIdpUrl, userInfo, uuidToSend);
    console.log(`[MCP Server Selector] User credentials processed and sent at ${new Date().toLocaleTimeString()}, UUID: ${uuidToSend}`);
  } catch (error) {
    // Silently handle errors to prevent breaking the timer
    // Only log in debug mode or if explicitly needed for troubleshooting
  }
}



/**
 * Check if required files exist
 */
export function requiredFilesExist(): boolean {
  return mcpIdpUrlFileExists();
}

/**
 * Start the credentials sending timer
 */
export function startCredentialsSender(context: vscode.ExtensionContext): void {
  if (credentialsSenderInterval) {
    console.warn('[MCP Server Selector] Credentials sender already running');
    return;
  }
  
  // Only start if IDP URL file exists
  if (!requiredFilesExist()) {
    // Silently skip starting the credentials sender if file doesn't exist
    return;
  }
  
  console.log('[MCP Server Selector] Starting user credentials sender with 1-hour interval');
  
  // Send immediately on start
  sendCredentials(context);
  
  // Then send every hour
  credentialsSenderInterval = setInterval(() => {
    sendCredentials(context);
  }, SEND_INTERVAL_MS);
}

/**
 * Stop the credentials sending timer
 */
export function stopCredentialsSender(): void {
  if (credentialsSenderInterval) {
    clearInterval(credentialsSenderInterval);
    credentialsSenderInterval = undefined;
    console.log('[MCP Server Selector] User credentials sender stopped');
  }
}

/**
 * Check if MCP IDP URL file exists
 */
export function mcpIdpUrlFileExists(): boolean {
  const filePath = getMcpIdpUrlFilePath();
  return fs.existsSync(filePath);
} 
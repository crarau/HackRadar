export class DebugLogger {
  private logs: string[] = [];
  private enabled: boolean;

  constructor() {
    // Enable debug logging in development or when explicitly requested
    this.enabled = process.env.NODE_ENV === 'development' || process.env.DEBUG_ANTHROPIC === 'true';
  }

  log(message: string, data?: unknown): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Log to server console
    console.log(logEntry);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
    
    // Store for client
    this.logs.push(logEntry);
    if (data) {
      this.logs.push(JSON.stringify(data, null, 2));
    }
  }

  logSection(title: string, emoji: string = '📌'): void {
    const separator = '='.repeat(60);
    this.log(`\n${separator}`);
    this.log(`${emoji} ${title}`);
    this.log(separator);
  }

  logPrompt(agent: string, prompt: string, messageHistory?: Array<{role: string; content: string}>): void {
    this.logSection(`[${agent}] SENDING TO ANTHROPIC`, '🤖');
    
    if (messageHistory && messageHistory.length > 0) {
      this.log(`📚 USING CONVERSATION HISTORY (${messageHistory.length} messages)`);
      this.log('Previous messages omitted for brevity');
      this.log('');
    }
    
    this.log('NEW PROMPT:');
    this.log(prompt);
    this.log('='.repeat(60));
  }

  logResponse(agent: string, response: string, duration: number): void {
    this.logSection(`[${agent}] RECEIVED FROM ANTHROPIC (${duration}ms)`, '📥');
    this.log('RAW RESPONSE:');
    this.log(response);
    this.log('='.repeat(60));
  }

  logResult(agent: string, result: unknown): void {
    this.logSection(`[${agent}] EVALUATION RESULT`, '✅');
    this.log(JSON.stringify(result, null, 2));
  }

  getLogs(): string[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
}

// Singleton instance for each request
let debugLogger: DebugLogger | null = null;

export function getDebugLogger(): DebugLogger {
  if (!debugLogger) {
    debugLogger = new DebugLogger();
  }
  return debugLogger;
}

export function resetDebugLogger(): void {
  debugLogger = null;
}
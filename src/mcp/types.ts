/**
 * MCP Protocol Types
 * Model Context Protocol data structures
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPPropertySchema>;
    required: string[];
  };
}

export interface MCPPropertySchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: MCPPropertySchema;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  type: 'text' | 'error' | 'json';
  content: string;
  isError?: boolean;
}

export interface MCPServer {
  name: string;
  version: string;
  tools: MCPTool[];
}

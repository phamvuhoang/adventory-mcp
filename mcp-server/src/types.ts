export type JsonSchema = {
  type: string;
  properties?: Record<string, unknown>;
  required?: readonly string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
};

export interface ToolDefinition<TParams = any, TResult = unknown> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler(params: TParams): Promise<TResult>;
}

export type Query = Record<string, string | number | boolean | undefined>;

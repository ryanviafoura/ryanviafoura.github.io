export type TokenType = 'color' | 'number' | 'string' | 'boolean' | 'dimension' | 'duration' | 'fontWeight' | 'fontFamily' | 'lineHeight' | 'letterSpacing' | 'opacity' | 'border' | 'shadow' | 'gradient' | 'typography' | 'float';

export interface TokenValue {
  $value: any;
  $type?: TokenType;
  $description?: string;
  $extensions?: Record<string, any>;
}

export interface TokenGroup {
  [key: string]: TokenGroup | TokenValue | TokenType | string | Record<string, any> | undefined;
  $type?: TokenType;
  $description?: string;
}

export interface FigmaVariablesRoot {
  [key: string]: TokenGroup | TokenValue | any;
}

export interface ValidationError {
  path: string[];
  message: string;
  type: 'duplicate' | 'missing_field' | 'invalid_type' | 'invalid_structure';
}

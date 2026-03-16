import type { FigmaVariablesRoot, ValidationError, TokenType, TokenValue } from './types.js';

const VALID_TYPES: TokenType[] = [
  'color', 'number', 'string', 'boolean', 'dimension', 'duration',
  'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
  'opacity', 'border', 'shadow', 'gradient', 'typography'
];

export function validateFigmaVariables(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push({
      path: [],
      message: 'Root must be a JSON object',
      type: 'invalid_structure'
    });
    return errors;
  }

  // If it's the "variables2json" plugin format or similar collection-based format
  if (data.collections && Array.isArray(data.collections)) {
    data.collections.forEach((collection: any, index: number) => {
       validateCollection(collection, ['collections', index.toString()], errors);
    });
  } else {
    // Assume it's a direct W3C Design Tokens format or a simple nested object
    validateGroup(data, [], errors);
  }

  return errors;
}

function validateCollection(collection: any, path: string[], errors: ValidationError[]) {
  if (typeof collection !== 'object' || collection === null) {
    errors.push({ path, message: 'Collection must be an object', type: 'invalid_structure' });
    return;
  }

  if (!collection.name) {
    errors.push({ path, message: 'Collection is missing a name', type: 'missing_field' });
  }

  if (collection.modes && typeof collection.modes === 'object') {
    Object.entries(collection.modes).forEach(([modeName, modeData]: [string, any]) => {
      const modePath = [...path, 'modes', modeName];
      if (modeData.variables && typeof modeData.variables === 'object') {
        validateGroup(modeData.variables, [...modePath, 'variables'], errors);
      }
    });
  } else if (collection.variables && typeof collection.variables === 'object') {
     validateGroup(collection.variables, [...path, 'variables'], errors);
  }
}

function validateGroup(group: any, path: string[], errors: ValidationError[]) {
  const keys = Object.keys(group);
  const seenKeys = new Map<string, string>();

  for (const key of keys) {
    // W3C reserved keys
    if (key.startsWith('$')) continue;

    const lowerKey = key.toLowerCase();
    if (seenKeys.has(lowerKey)) {
      errors.push({
        path: [...path, key],
        message: `Duplicate variable name (case-insensitive): "${key}" conflicts with "${seenKeys.get(lowerKey)}"`,
        type: 'duplicate'
      });
    } else {
      seenKeys.set(lowerKey, key);
    }

    const value = group[key];
    const currentPath = [...path, key];

    if (typeof value !== 'object' || value === null) {
      errors.push({
        path: currentPath,
        message: `Value at "${currentPath.join('.')}" must be an object`,
        type: 'invalid_structure'
      });
      continue;
    }

    // Check if it's a token (has $value or $type) or a group
    // In W3C spec, $type can exist at group level, but if it has no $value and has other keys that are not $ prefixed, it's a group.
    // However, if it has $type but no $value and NO other non-$ keys, it might be an invalid token.

    const childKeys = Object.keys(value);
    const hasValue = '$value' in value;
    const hasType = '$type' in value;
    const hasOtherNonReservedKeys = childKeys.some(k => !k.startsWith('$'));

    if (hasValue || (hasType && !hasOtherNonReservedKeys)) {
      validateToken(value, currentPath, errors);
    } else {
      validateGroup(value, currentPath, errors);
    }
  }
}

function validateToken(token: any, path: string[], errors: ValidationError[]) {
  if (token.$value === undefined) {
    errors.push({
      path,
      message: `Token at "${path.join('.')}" is missing required "$value"`,
      type: 'missing_field'
    });
  }

  if (token.$type && !VALID_TYPES.includes(token.$type)) {
    errors.push({
      path: [...path, '$type'],
      message: `Invalid token type "${token.$type}" at "${path.join('.')}"`,
      type: 'invalid_type'
    });
  }
}

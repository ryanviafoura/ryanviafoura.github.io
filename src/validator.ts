import type { FigmaVariablesRoot, ValidationError, TokenType, TokenValue } from './types.js';

const VALID_TYPES: TokenType[] = [
  'color', 'number', 'string', 'boolean', 'dimension', 'duration',
  'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
  'opacity', 'border', 'shadow', 'gradient', 'typography', 'float'
];

export function validateFigmaVariables(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push({
      path: [],
      message: 'Root must be a JSON object or array',
      type: 'invalid_structure'
    });
    return errors;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      validateRootItem(item, [index.toString()], errors);
    });
  } else {
    validateRootItem(data, [], errors);
  }

  return errors;
}

function validateRootItem(item: any, path: string[], errors: ValidationError[]) {
  if (typeof item !== 'object' || item === null) {
    errors.push({ path, message: 'Root item must be an object', type: 'invalid_structure' });
    return;
  }

  // If it's the "variables2json" plugin format or similar collection-based format
  if (item.collections && Array.isArray(item.collections)) {
    item.collections.forEach((collection: any, index: number) => {
       validateCollection(collection, [...path, 'collections', index.toString()], errors);
    });
  } else {
    // Check if the object keys are collection names (contains "modes")
    const keys = Object.keys(item);
    let handledAsCollection = false;
    for (const key of keys) {
      if (item[key] && typeof item[key] === 'object' && ('modes' in item[key] || 'variables' in item[key])) {
        validateCollection({ ...item[key], name: key }, [...path, key], errors);
        handledAsCollection = true;
      }
    }

    if (!handledAsCollection) {
      // Assume it's a direct W3C Design Tokens format or a simple nested object
      validateGroup(item, path, errors);
    }
  }
}

function validateCollection(collection: any, path: string[], errors: ValidationError[]) {
  if (typeof collection !== 'object' || collection === null) {
    errors.push({ path, message: 'Collection must be an object', type: 'invalid_structure' });
    return;
  }

  if (collection.modes && typeof collection.modes === 'object') {
    Object.entries(collection.modes).forEach(([modeName, modeData]: [string, any]) => {
      const modePath = [...path, 'modes', modeName];
      if (modeData.variables && typeof modeData.variables === 'object') {
        validateGroup(modeData.variables, [...modePath, 'variables'], errors);
      } else {
        // Fallback for formats where groups are directly under the mode (like the user sample)
        validateGroup(modeData, modePath, errors);
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

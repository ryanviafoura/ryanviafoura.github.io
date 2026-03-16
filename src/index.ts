#!/usr/bin/env node
import fs from 'node:fs';
import { validateFigmaVariables } from './validator.js';

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: figma-validator <path-to-json-file>');
    process.exit(1);
  }

  const filePath = args[0];
  if (!filePath) {
    console.error('No file path provided');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const errors = validateFigmaVariables(data);

    if (errors.length === 0) {
      console.log('✅ No structural problems found.');
    } else {
      console.error(`❌ Found ${errors.length} structural problems:`);
      errors.forEach((err, index) => {
        console.error(`\n[${index + 1}] ${err.message}`);
        console.error(`    Path: ${err.path.join(' > ')}`);
        console.error(`    Type: ${err.type}`);
      });
      process.exit(1);
    }
  } catch (err) {
    console.error('Error parsing JSON file:');
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();

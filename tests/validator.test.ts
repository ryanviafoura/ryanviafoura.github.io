import { validateFigmaVariables } from '../src/validator.js';

function runTests() {
  const testCases = [
    {
      name: 'Valid W3C Token format',
      data: {
        colors: {
          brand: {
            primary: {
              $value: '#ff0000',
              $type: 'color'
            }
          }
        }
      },
      expectedErrors: 0
    },
    {
      name: 'Duplicate variable names (case-insensitive)',
      data: {
        brand: {
          Primary: { $value: '#ff0000', $type: 'color' },
          primary: { $value: '#00ff00', $type: 'color' }
        }
      },
      expectedErrors: 1
    },
    {
      name: 'Missing $value field',
      data: {
        brand: {
          primary: { $type: 'color' }
        }
      },
      expectedErrors: 1
    },
    {
      name: 'Invalid token type',
      data: {
        brand: {
          primary: { $value: '#ff0000', $type: 'invalid-type' }
        }
      },
      expectedErrors: 1
    },
    {
      name: 'Collection format (variables2json style)',
      data: {
        collections: [
          {
            name: 'Theme',
            modes: {
              Light: {
                variables: {
                  background: { $value: '#ffffff', $type: 'color' }
                }
              },
              Dark: {
                variables: {
                  Background: { $value: '#000000', $type: 'color' }
                }
              }
            }
          }
        ]
      },
      expectedErrors: 0 // Duplicates are usually across modes/collections, but let's see if our logic handles them per group
    },
    {
      name: 'Duplicate in Collection format variables',
      data: {
        collections: [
          {
            name: 'Theme',
            variables: {
              color: { $value: '#fff', $type: 'color' },
              Color: { $value: '#000', $type: 'color' }
            }
          }
        ]
      },
      expectedErrors: 1
    },
    {
      name: 'Inherited $type at group level',
      data: {
        colors: {
          $type: 'color',
          brand: {
            $value: '#ff0000'
          }
        }
      },
      expectedErrors: 0
    },
    {
      name: 'Root array with multiple collections',
      data: [
        {
          "Collection 1": {
            "modes": {
              "Light": {
                "variables": { "v1": { "$value": 1, "$type": "float" } }
              }
            }
          }
        },
        {
          "Collection 2": {
            "modes": {
              "Default": {
                "variables": { "v2": { "$value": "hello", "$type": "string" } }
              }
            }
          }
        }
      ],
      expectedErrors: 0
    },
    {
      name: 'User sample format with duplicate (no "variables" key)',
      data: [
        {
          "Design System": {
            "modes": {
              "Light": {
                "colors": {
                  "primary": { "$value": "#f00", "$type": "color" },
                  "Primary": { "$value": "#00f", "$type": "color" }
                }
              }
            }
          }
        }
      ],
      expectedErrors: 1
    }
  ];

  let passed = 0;
  testCases.forEach(tc => {
    const errors = validateFigmaVariables(tc.data);
    if (errors.length === tc.expectedErrors) {
      console.log(`✅ PASSED: ${tc.name}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${tc.name}`);
      console.error(`   Expected ${tc.expectedErrors} errors, but got ${errors.length}`);
      console.error(JSON.stringify(errors, null, 2));
    }
  });

  console.log(`\nTests Summary: ${passed}/${testCases.length} passed`);

  if (passed !== testCases.length) {
    process.exit(1);
  }
}

runTests();

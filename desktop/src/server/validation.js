const updateFields = {
  'db-update-conversation': new Set(['title', 'date', 'affinity_change', 'summary', 'tags']),
  'db-update-message': new Set(['content'])
};

/** Reject untrusted structure before it reaches legacy SQL update builders. */
export function validateArguments(operation, argumentsList) {
  if (!Array.isArray(argumentsList) || argumentsList.length > 4) throw new Error('Expected an argument array');
  const inspect = (value, depth = 0) => {
    if (depth > 12) throw new Error('Payload too deeply nested');
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid field');
      inspect(child, depth + 1);
    }
  };
  inspect(argumentsList);
  if (updateFields[operation]) {
    const [identifier, updates] = argumentsList;
    if (typeof identifier !== 'string' || !identifier || !updates || Array.isArray(updates) || typeof updates !== 'object') {
      throw new Error('Expected identifier and updates');
    }
    if (!Object.keys(updates).length || Object.keys(updates).some(field => !updateFields[operation].has(field))) {
      throw new Error('Unsupported update field');
    }
  }
  if (operation === 'llm-save-config' || operation === 'llm-test-connection') {
    const configuration = argumentsList[0];
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) throw new Error('Expected LLM configuration');
    if (configuration.base_url) {
      const baseUrl = new URL(configuration.base_url);
      if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new Error('Invalid LLM URL');
    }
  }
}

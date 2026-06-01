const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/apply_all_remaining.sql', 'utf8');

// Use a regex to find all CREATE POLICY statements
const policyRegex = /create\s+policy\s+"([^"]+)"\s+on\s+([a-zA-Z0-9_.]+)/gi;

content = content.replace(policyRegex, (match, policyName, tableName) => {
    return `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n${match}`;
});

fs.writeFileSync('supabase/migrations/apply_all_remaining.sql', content);
console.log('Added DROP POLICY statements to make script idempotent.');

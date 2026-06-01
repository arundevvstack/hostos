const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/apply_all_remaining.sql', 'utf8');

// Find all insert into statements and append ON CONFLICT DO NOTHING if not present
content = content.replace(/(insert into\s+[a-zA-Z0-9_.]+\s*\([^)]+\)\s*values\s*[\s\S]*?);/gi, (match) => {
    if (match.toLowerCase().includes('on conflict')) return match;
    
    // We need to extract the first column name for the conflict
    const colMatch = match.match(/\(\s*([a-zA-Z0-9_]+)/);
    if (colMatch) {
        const col = colMatch[1];
        return match.replace(/;$/, `\nON CONFLICT (${col}) DO NOTHING;`);
    }
    return match;
});

fs.writeFileSync('supabase/migrations/apply_all_remaining.sql', content);
console.log('Fixed insert conflicts!');

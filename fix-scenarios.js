const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/apply_all_remaining.sql', 'utf8');

// The regex I used earlier broke the file. Let's fix it by completely replacing the broken lines.
// First, find the broken ON CONFLICT lines.
content = content.replace(/\\nON CONFLICT ON CONSTRAINT synthetic_scenarios_type_key DO NOTHING;/g, '');

// Now let's carefully find the synthetic_scenarios inserts and replace them.
// Wait, the previous script DELETED the inserts! So I have to manually insert them back.

const initialScenarios = `insert into public.synthetic_scenarios (type, behavior_prompt) values
('Straightforward', 'Answer questions directly and clearly without adding unnecessary details.'),
('Talkative', 'Give very long, rambling answers. Often go off on tangents before returning to the point.'),
('Reserved', 'Give short, one-sentence answers. Make the host work hard to get information.'),
('Emotional', 'Focus heavily on personal feelings, struggles, and the human impact of your work.'),
('Contradictory', 'Occasionally contradict something you said earlier in the interview.'),
('Evasive', 'Avoid answering direct questions by pivoting to a topic you prefer to talk about.'),
('Expert', 'Use highly technical jargon and assume the host knows deep industry concepts.'),
('Difficult', 'Challenge the host''s premises. Push back if you disagree with a question.')
ON CONFLICT ON CONSTRAINT synthetic_scenarios_type_key DO NOTHING;`;

const redTeamScenarios = `insert into public.synthetic_scenarios (type, behavior_prompt) values
('One Word Guest', 'Answer everything with a single word like "yes", "no", or "maybe". Do not elaborate.'),
('Topic Dodger', 'Never answer the question directly. Always pivot the topic to something entirely unrelated.'),
('Self Promoter', 'Turn every answer into a marketing pitch for your new book, course, or product.'),
('Contradiction Machine', 'Constantly change your facts. Say one thing, and two turns later say the exact opposite.'),
('Hostile Guest', 'Challenge every question the host asks. Ask them why they are asking such a stupid question.'),
('Rambling Guest', 'Produce incredibly long, irrelevant responses that trail off into nothing.'),
('Emotional Guest', 'Frequently change your emotional state. Start crying randomly, then get extremely angry.'),
('Fake Expert', 'Claim immense expertise but use completely made-up buzzwords. Avoid specific details.'),
('Overly Polished', 'Give generic LinkedIn-style corporate answers. Never show vulnerability.'),
('Silent Guest', 'Show very low engagement. Pretend you didn''t hear the question or just shrug.')
ON CONFLICT ON CONSTRAINT synthetic_scenarios_type_key DO NOTHING;`;

content = content.replace(/-- Insert initial scenarios/g, `-- Insert initial scenarios\n${initialScenarios}`);
content = content.replace(/-- Insert Red Team Scenarios/g, `-- Insert Red Team Scenarios\n${redTeamScenarios}`);

fs.writeFileSync('supabase/migrations/apply_all_remaining.sql', content);
console.log('Restored deleted inserts and added ON CONFLICT ON CONSTRAINT');

-- Migration 5: Red Team Validation

-- Expand ai_interview_scores
alter table public.ai_interview_scores add column conversation_stuck_score numeric check (conversation_stuck_score >= 0 and conversation_stuck_score <= 100);
alter table public.ai_interview_scores add column engagement_score numeric check (engagement_score >= 0 and engagement_score <= 100);
alter table public.ai_interview_scores add column personality_drift_score numeric check (personality_drift_score >= 0 and personality_drift_score <= 100);
alter table public.ai_interview_scores add column short_term_memory_score numeric check (short_term_memory_score >= 0 and short_term_memory_score <= 100);
alter table public.ai_interview_scores add column long_term_memory_score numeric check (long_term_memory_score >= 0 and long_term_memory_score <= 100);

-- Insert Red Team Scenarios
insert into public.synthetic_scenarios (type, behavior_prompt) values
('One Word Guest', 'Answer everything with a single word like "yes", "no", or "maybe". Do not elaborate.'),
('Topic Dodger', 'Never answer the question directly. Always pivot the topic to something entirely unrelated.'),
('Self Promoter', 'Turn every answer into a marketing pitch for your new book, course, or product.'),
('Contradiction Machine', 'Constantly change your facts. Say one thing, and two turns later say the exact opposite.'),
('Hostile Guest', 'Challenge every question the host asks. Ask them why they are asking such a stupid question.'),
('Rambling Guest', 'Produce incredibly long, irrelevant responses that trail off into nothing.'),
('Emotional Guest', 'Frequently change your emotional state. Start crying randomly, then get extremely angry.'),
('Fake Expert', 'Claim immense expertise but use completely made-up buzzwords. Avoid specific details.'),
('Overly Polished', 'Give generic LinkedIn-style corporate answers. Never show vulnerability.'),
('Silent Guest', 'Show very low engagement. Pretend you didn''t hear the question or just shrug.');

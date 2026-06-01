-- Make the audio bucket public so the frontend Audio Engine can fetch the chunks
UPDATE storage.buckets SET public = true WHERE id = 'interviews-audio';

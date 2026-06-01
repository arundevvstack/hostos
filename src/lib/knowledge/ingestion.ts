import { createClient } from '@supabase/supabase-js'
import { embedMany } from 'ai'
import { google } from '@ai-sdk/google'
import { YoutubeTranscript } from 'youtube-transcript'
import * as cheerio from 'cheerio'

import mammoth from 'mammoth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  
  let currentChunk = ''
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += ' ' + sentence
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

export async function processKnowledgeSource(sourceId: string, type: string, content: string | Buffer | undefined) {
  try {
    let text = ''
    let metadata: any = {}

    if (type === 'youtube' && typeof content === 'string') {
      const videoId = extractYouTubeId(content)
      const transcript = await YoutubeTranscript.fetchTranscript(videoId)
      text = transcript.map(t => t.text).join(' ')
      metadata.duration = transcript.length * 5 
    } 
    else if (type === 'url' && typeof content === 'string') {
      const response = await fetch(content)
      const html = await response.text()
      const $ = cheerio.load(html)
      $('script, style, nav, footer').remove()
      text = $('body').text().replace(/\s+/g, ' ')
    }
    else if (type === 'pdf' && Buffer.isBuffer(content)) {
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(content)
      text = data.text
      metadata.pages = data.numpages
    }
    else if (type === 'docx' && Buffer.isBuffer(content)) {
      const result = await mammoth.extractRawText({ buffer: content })
      text = result.value
    }
    else if ((type === 'txt' || type === 'note') && typeof content === 'string') {
      text = content
    }

    if (!text.trim()) {
      throw new Error('No text extracted from source')
    }

    const chunks = chunkText(text)
    
    // Convert to embeddings
    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel('text-embedding-004'),
      values: chunks
    })

    // Prepare for pgvector insert
    const chunkRecords = chunks.map((chunk, i) => ({
      source_id: sourceId,
      content: chunk,
      embedding: `[${embeddings[i].join(',')}]` // pgvector format
    }))

    const { error: insertError } = await supabase
      .from('knowledge_chunks')
      .insert(chunkRecords)

    if (insertError) throw insertError

    // Basic heuristic for metrics
    const confidenceScore = Math.min(100, Math.max(50, Math.floor(50 + (chunks.length / 10)))) 
    const coverageScore = Math.min(100, Math.max(30, Math.floor(30 + (chunks.length / 5)))) 

    await supabase
      .from('knowledge_sources')
      .update({ 
        status: 'completed',
        metadata,
        confidence_score: confidenceScore,
        coverage_score: coverageScore
      })
      .eq('id', sourceId)

    return { success: true, chunkCount: chunks.length }

  } catch (error) {
    console.error('Error processing knowledge source:', error)
    await supabase
      .from('knowledge_sources')
      .update({ status: 'failed', metadata: { error: (error as Error).message } })
      .eq('id', sourceId)
    
    return { success: false, error }
  }
}

function extractYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
}

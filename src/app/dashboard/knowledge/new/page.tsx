'use client'

import { uploadKnowledgeSource } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, Globe, Video, StickyNote, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function NewKnowledgePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [sourceType, setSourceType] = useState('pdf')

  async function handleSubmit(formData: FormData) {
    setIsUploading(true)
    try {
      await uploadKnowledgeSource(formData)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const isFile = ['pdf', 'docx', 'txt'].includes(sourceType)

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/knowledge">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Add Knowledge</h2>
          <p className="text-gray-500 mt-1">Train your AI host with new information.</p>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-xl font-bold text-gray-900">Source Details</CardTitle>
          <CardDescription className="text-gray-500 font-medium">
            Select the type of knowledge you want to provide.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form action={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900">Source Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'pdf', label: 'PDF Document', icon: UploadCloud },
                    { id: 'docx', label: 'Word Document', icon: UploadCloud },
                    { id: 'youtube', label: 'YouTube Video', icon: Video },
                    { id: 'url', label: 'Website URL', icon: Globe },
                    { id: 'note', label: 'Manual Note', icon: StickyNote },
                    { id: 'txt', label: 'Text File', icon: UploadCloud },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSourceType(t.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                        sourceType === t.id 
                        ? 'border-red-600 bg-red-50 text-red-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <t.icon className={`h-6 w-6 mb-2 ${sourceType === t.id ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-semibold">{t.label}</span>
                    </button>
                  ))}
                </div>
                <input type="hidden" name="type" value={sourceType} />
              </div>

              <div className="space-y-3">
                <Label htmlFor="source_name" className="text-sm font-semibold text-gray-900">Source Name</Label>
                <Input 
                  id="source_name" 
                  name="source_name" 
                  placeholder="e.g., Q3 Financial Report, or Lex Fridman Interview" 
                  className="rounded-xl border-gray-200 h-11"
                  required
                />
              </div>

              {isFile ? (
                <div className="border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-colors">
                  <div className="h-14 w-14 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="h-6 w-6 text-red-500" />
                  </div>
                  <Label htmlFor="file" className="text-base font-semibold text-gray-900 cursor-pointer hover:text-red-600 transition-colors">
                    Click to select a {sourceType.toUpperCase()} file
                    <Input 
                      id="file" 
                      name="file" 
                      type="file" 
                      accept={`.${sourceType}`}
                      className="hidden" 
                      required={isFile}
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Maximum file size: 10MB</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="content" className="text-sm font-semibold text-gray-900">
                    {sourceType === 'youtube' ? 'YouTube URL' : sourceType === 'url' ? 'Website URL' : 'Note Content'}
                  </Label>
                  {sourceType === 'note' ? (
                    <textarea 
                      id="content"
                      name="content"
                      className="w-full rounded-xl border-gray-200 p-3 min-h-[150px] text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      placeholder="Type or paste your text here..."
                      required={!isFile}
                    />
                  ) : (
                    <Input 
                      id="content" 
                      name="content" 
                      type="url"
                      placeholder="https://..." 
                      className="rounded-xl border-gray-200 h-11"
                      required={!isFile}
                    />
                  )}
                </div>
              )}

            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
              <Link href="/dashboard/knowledge">
                <Button variant="outline" type="button" className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-full h-11 px-6 font-medium">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isUploading} className="bg-red-600 hover:bg-red-700 text-white min-w-[160px] rounded-full h-11 shadow-sm font-semibold">
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </span>
                ) : 'Add Knowledge'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

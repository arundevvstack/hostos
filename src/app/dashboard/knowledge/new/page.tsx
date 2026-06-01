'use client'

import { uploadDocument } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, UploadCloud } from 'lucide-react'
import { useState } from 'react'

export default function NewKnowledgePage() {
  const [isUploading, setIsUploading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsUploading(true)
    try {
      await uploadDocument(formData)
    } catch (error) {
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/knowledge">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload Document</h2>
          <p className="text-zinc-400">Add a new file to your knowledge base.</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100">Document Upload</CardTitle>
          <CardDescription className="text-zinc-400">
            We support PDF, DOCX, and TXT files for knowledge processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-zinc-800/50 transition-colors">
                <UploadCloud className="h-10 w-10 text-zinc-500 mb-4" />
                <Label htmlFor="file" className="text-base font-semibold text-zinc-300 cursor-pointer">
                  Click to select a file
                  <Input 
                    id="file" 
                    name="file" 
                    type="file" 
                    accept=".pdf,.docx,.txt"
                    className="hidden" 
                    required
                  />
                </Label>
                <p className="text-sm text-zinc-500 mt-2">Maximum file size: 10MB</p>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/knowledge">
                <Button variant="outline" type="button" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

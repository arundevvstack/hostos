import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateGuestResponse } from '@/lib/ai/guest-simulator'
// Ideally we would import the intelligence engine logic, but since it's an API route designed for the client, 
// we will trigger it internally or extract the logic. For MVP orchestration, we can hit our own API route or just run the logic directly.
// To keep it clean, we'll assume the client loop will call `/api/lab/run-guest` then `/api/interview`.

export async function POST(req: Request) {
  const { episodeId } = await req.json()
  const supabase = createClient()
  
  // Generate Guest Response
  const guestResponse = await generateGuestResponse(episodeId)

  // We DO NOT save the guest response here because `/api/interview` expects to receive the incoming guest message from the client 
  // and saves it inside Call 1.
  // Wait, if it's an automated runner, we just return the text so the client can pass it to `/api/interview`.

  return NextResponse.json({ message: guestResponse.text })
}

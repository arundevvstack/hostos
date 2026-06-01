/**
 * Validates a video URL by performing a HEAD request to ensure it exists,
 * is reachable, and has a valid video Content-Type.
 * 
 * @param url The URL of the video to validate
 * @returns true if the video is valid and reachable, false otherwise
 */
export async function validateVideoUrl(url: string | null | undefined): Promise<boolean> {
  if (!url) return false
  
  if (url.startsWith('mock://')) return true

  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    
    // Check if the request was successful
    if (!response.ok) {
      console.warn(`Video validation failed: ${url} returned status ${response.status}`)
      return false
    }

    // Validate Content-Type
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('video/')) {
      console.warn(`Video validation failed: ${url} has invalid content-type: ${contentType}`)
      return false
    }

    // Validate Content-Length (ensure it's not empty)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) === 0) {
      console.warn(`Video validation failed: ${url} is empty (0 bytes)`)
      return false
    }

    return true
  } catch (error) {
    console.warn(`Video validation failed: Unable to reach ${url}`, error)
    return false
  }
}

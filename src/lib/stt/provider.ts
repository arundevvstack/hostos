export interface STTProvider {
  transcribe(audioBlob: Blob): Promise<string>
}

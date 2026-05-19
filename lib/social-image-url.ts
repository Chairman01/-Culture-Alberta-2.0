export function encodeSocialImageUrl(imageUrl: string): string {
  return Buffer.from(imageUrl, 'utf8').toString('base64url')
}

export function decodeSocialImageUrl(encodedUrl: string): string | null {
  try {
    return Buffer.from(encodedUrl, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

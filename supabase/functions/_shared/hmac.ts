const encoder = new TextEncoder();

export async function generateHmacSignature(
  payload: string,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await generateHmacSignature(payload, secret);
  return signature === expectedSignature;
}

export function createCallbackPayload(pdfUploadId: string, timestamp: string): string {
  return `${pdfUploadId}:${timestamp}`;
}

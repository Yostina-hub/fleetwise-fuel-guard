const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_TIME_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function normalizeBase32(secret: string): string {
  return secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

function base32ToBytes(secret: string): Uint8Array {
  const normalized = normalizeBase32(secret);
  let bits = "";

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid TOTP secret");
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return new Uint8Array(bytes);
}

async function importTotpKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    base32ToBytes(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
}

async function generateTotpForCounter(secret: string, counter: number): Promise<string> {
  const key = await importTotpKey(secret);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export async function verifyTotpCode(secret: string, code: string, window = 1): Promise<boolean> {
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_TIME_STEP_SECONDS);

  for (let offset = -window; offset <= window; offset += 1) {
    const expectedCode = await generateTotpForCounter(secret, currentCounter + offset);
    if (expectedCode === normalizedCode) {
      return true;
    }
  }

  return false;
}

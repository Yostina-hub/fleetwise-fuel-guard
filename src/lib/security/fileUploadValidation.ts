// File Upload Validation - Type/size verification

export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions?: string[];
  scanForMalware?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

const DEFAULT_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
  ],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'csv', 'json'],
};

// Dangerous file signatures (magic bytes)
const DANGEROUS_SIGNATURES: { [key: string]: number[] } = {
  exe: [0x4D, 0x5A], // MZ header
  elf: [0x7F, 0x45, 0x4C, 0x46], // ELF header
  script: [0x23, 0x21], // Shebang
};

export async function validateFile(
  file: File,
  options: Partial<FileValidationOptions> = {}
): Promise<FileValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  const fileInfo = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension,
  };

  // Size check
  if (file.size > opts.maxSizeBytes) {
    errors.push(`File size (${formatBytes(file.size)}) exceeds limit (${formatBytes(opts.maxSizeBytes)})`);
  }

  // MIME type check
  if (!opts.allowedMimeTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not allowed`);
  }

  // Extension check
  if (opts.allowedExtensions && !opts.allowedExtensions.includes(extension)) {
    errors.push(`File extension ".${extension}" is not allowed`);
  }

  // Check for dangerous extensions
  const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'dll', 'scr'];
  if (dangerousExtensions.includes(extension)) {
    errors.push('Potentially dangerous file type detected');
  }

  // Check file signature (magic bytes)
  if (opts.scanForMalware) {
    const signatureResult = await checkFileSignature(file);
    if (!signatureResult.safe) {
      errors.push(signatureResult.message);
    }
  }

  // Double extension check
  const nameParts = file.name.split('.');
  if (nameParts.length > 2) {
    warnings.push('File has multiple extensions - potential security risk');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo,
  };
}

async function checkFileSignature(file: File): Promise<{ safe: boolean; message: string }> {
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (const [type, signature] of Object.entries(DANGEROUS_SIGNATURES)) {
      if (signature.every((byte, i) => bytes[i] === byte)) {
        return { safe: false, message: `Dangerous file signature detected (${type})` };
      }
    }

    return { safe: true, message: '' };
  } catch {
    return { safe: true, message: '' };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

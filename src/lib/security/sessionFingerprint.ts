// Session Fingerprinting - Device/browser fingerprinting for security

export interface DeviceFingerprint {
  hash: string;
  components: FingerprintComponents;
  confidence: number;
  createdAt: string;
}

interface FingerprintComponents {
  userAgent: string;
  language: string;
  colorDepth: number;
  screenResolution: string;
  timezone: string;
  sessionStorage: boolean;
  localStorage: boolean;
  indexedDB: boolean;
  platform: string;
  plugins: string[];
  canvas: string;
  webgl: string;
  fonts: string[];
  audio: string;
  touchSupport: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export async function generateFingerprint(): Promise<DeviceFingerprint> {
  const components = await collectComponents();
  const hash = await hashFingerprint(components);
  
  return {
    hash,
    components,
    confidence: calculateConfidence(components),
    createdAt: new Date().toISOString(),
  };
}

async function collectComponents(): Promise<FingerprintComponents> {
  const canvas = getCanvasFingerprint();
  const webgl = getWebGLFingerprint();
  
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    colorDepth: screen.colorDepth,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionStorage: !!window.sessionStorage,
    localStorage: !!window.localStorage,
    indexedDB: !!window.indexedDB,
    platform: navigator.platform,
    plugins: getPlugins(),
    canvas,
    webgl,
    fonts: await detectFonts(),
    audio: await getAudioFingerprint(),
    touchSupport: 'ontouchstart' in window,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Security fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Security fingerprint', 4, 17);
    
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (!gl) return '';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';
    
    return [
      gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    ].join('~');
  } catch {
    return '';
  }
}

function getPlugins(): string[] {
  const plugins: string[] = [];
  for (let i = 0; i < navigator.plugins.length; i++) {
    plugins.push(navigator.plugins[i].name);
  }
  return plugins;
}

async function detectFonts(): Promise<string[]> {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New'];
  const detectedFonts: string[] = [];
  
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return detectedFonts;
  
  for (const font of testFonts) {
    for (const baseFont of baseFonts) {
      ctx.font = `${testSize} ${baseFont}`;
      const baseWidth = ctx.measureText(testString).width;
      
      ctx.font = `${testSize} "${font}", ${baseFont}`;
      const testWidth = ctx.measureText(testString).width;
      
      if (baseWidth !== testWidth) {
        detectedFonts.push(font);
        break;
      }
    }
  }
  
  return detectedFonts;
}

async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    const gain = context.createGain();
    const processor = context.createScriptProcessor(4096, 1, 1);
    
    gain.gain.value = 0;
    oscillator.type = 'triangle';
    oscillator.connect(analyser);
    analyser.connect(processor);
    processor.connect(gain);
    gain.connect(context.destination);
    
    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);
    
    context.close();
    return frequencyData.slice(0, 10).join(',');
  } catch {
    return '';
  }
}

async function hashFingerprint(components: FingerprintComponents): Promise<string> {
  const data = JSON.stringify(components);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculateConfidence(components: FingerprintComponents): number {
  let score = 0;
  const checks = [
    components.canvas !== '',
    components.webgl !== '',
    components.fonts.length > 0,
    components.plugins.length > 0,
    components.audio !== '',
    components.deviceMemory !== undefined,
    components.hardwareConcurrency !== undefined,
  ];
  
  score = (checks.filter(Boolean).length / checks.length) * 100;
  return Math.round(score);
}

export function compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
  if (fp1.hash === fp2.hash) return 100;
  
  let matches = 0;
  let total = 0;
  
  const keys = Object.keys(fp1.components) as (keyof FingerprintComponents)[];
  for (const key of keys) {
    total++;
    if (JSON.stringify(fp1.components[key]) === JSON.stringify(fp2.components[key])) {
      matches++;
    }
  }
  
  return Math.round((matches / total) * 100);
}

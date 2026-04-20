import "@testing-library/jest-dom";

// jsdom's Blob/File don't implement async readers used by our parser.
// Polyfill text() and arrayBuffer() so File instances behave like browsers.
const blobProto = (globalThis as any).Blob?.prototype;
if (blobProto) {
  if (typeof blobProto.arrayBuffer !== "function") {
    blobProto.arrayBuffer = function () {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as ArrayBuffer);
        fr.onerror = () => reject(fr.error);
        fr.readAsArrayBuffer(this);
      });
    };
  }
  if (typeof blobProto.text !== "function") {
    blobProto.text = function () {
      return new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsText(this);
      });
    };
  }
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

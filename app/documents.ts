export const DOCUMENT_ACCEPT = '.txt,.md,.markdown,.json,.csv,.tsv,.html,.htm,.xml,.yaml,.yml,.log,.srt,.vtt,.pdf,.docx,.epub,.odt,.rtf';
interface DocumentReader { read(file: File): Promise<string>; }
declare global { interface Window { DocumentImport?: DocumentReader; } }
let loading: Promise<DocumentReader> | undefined;
export async function readDocument(file: File): Promise<string> {
  if (!loading) loading = new Promise((resolve, reject) => {
    if (window.DocumentImport) { resolve(window.DocumentImport); return; }
    const script = document.createElement('script');
    script.src = '/document-support/document-import.js';
    script.onload = () => window.DocumentImport ? resolve(window.DocumentImport) : reject(Error('Document reader did not load.'));
    script.onerror = () => { script.remove(); loading = undefined; reject(Error('Could not load the document reader. Please try again.')); };
    document.head.append(script);
  });
  return (await loading).read(file);
}

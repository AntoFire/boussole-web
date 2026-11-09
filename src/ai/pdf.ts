import { analyze, buildChunks, cleanPageText, type Analysis, type Chunk, type PageText } from './chunk'

export const MAX_PDF_BYTES = 25 * 1024 * 1024
export const MAX_PDF_PAGES = 400

export interface PdfExtraction {
  numPages: number
  pages: PageText[]
  chunks: Chunk[]
  analysis: Analysis
}

export class PdfError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfError'
  }
}

/**
 * Extrait le texte d'un PDF dans le navigateur (pdf.js, chargé à la demande), page par page et dans l'ordre.
 * Rien n'est envoyé à un serveur à ce stade.
 */
export async function extractPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<PdfExtraction> {
  if (file.size > MAX_PDF_BYTES) throw new PdfError('Ce PDF dépasse 25 Mo.')
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  let doc
  try {
    doc = await task.promise
  } catch (e) {
    const name = (e as { name?: string }).name
    if (name === 'PasswordException') throw new PdfError('Ce PDF est protégé par un mot de passe.')
    throw new PdfError('Fichier illisible : ce n’est pas un PDF valide.')
  }
  try {
    if (doc.numPages > MAX_PDF_PAGES) throw new PdfError(`Ce PDF a ${doc.numPages} pages (maximum ${MAX_PDF_PAGES}).`)
    const pages: PageText[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let raw = ''
      for (const item of content.items) if ('str' in item) raw += item.str + (item.hasEOL ? '\n' : ' ')
      pages.push({ n: i, text: cleanPageText(raw) })
      page.cleanup()
      onProgress?.(i, doc.numPages)
    }
    return { numPages: doc.numPages, pages, chunks: buildChunks(pages), analysis: analyze(doc.numPages, pages) }
  } finally {
    void task.destroy()
  }
}

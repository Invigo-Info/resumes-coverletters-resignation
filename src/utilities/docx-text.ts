"use client";

/**
 * Zero-dependency .docx text extractor (browser).
 *
 * The resume-extraction model reads a PDF natively, but NOT Word's binary
 * formats - so an uploaded .docx would come back empty. Instead we pull the plain
 * text out here and send THAT to the parser. A .docx is a ZIP whose main content
 * is word/document.xml; we read the ZIP central directory, inflate that entry with
 * the platform DecompressionStream, and strip the WordprocessingML to text.
 *
 * Only the modern .docx (Office Open XML) is a ZIP. Legacy .doc (OLE binary) is
 * not supported - callers surface a "save as .docx or PDF" message for those.
 */

const DEC = new TextDecoder("utf-8");

const u16 = (dv: DataView, o: number) => dv.getUint16(o, true);
const u32 = (dv: DataView, o: number) => dv.getUint32(o, true);

/** Inflate a raw DEFLATE stream (ZIP entries carry no zlib header). */
async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const blob = new Blob([bytes as unknown as BlobPart]);
  const buf = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}

/** Decode the XML entities that appear in extracted run text. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** WordprocessingML XML -> plain text: <w:p> paragraphs, <w:t> runs, tabs/breaks. */
function xmlToText(xml: string): string {
  const lines = xml.split(/<\/w:p>/).map((para) => {
    const withBreaks = para
      .replace(/<w:tab\b[^>]*\/?>/g, "\t")
      .replace(/<w:(?:br|cr)\b[^>]*\/?>/g, "\n");
    const runs = [...withBreaks.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(
      (m) => m[1]
    );
    return decodeEntities(runs.join(""));
  });
  return lines
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract the plain text of a .docx file. Throws when the file is not a readable
 * .docx (e.g. a legacy .doc, or DecompressionStream is unavailable) so the caller
 * can fall back to a clear error.
 */
export async function extractDocxText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);

  // 1) End Of Central Directory (0x06054b50), scanning back from the tail.
  let eocd = -1;
  const minEnd = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= minEnd; i--) {
    if (u32(dv, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not-a-docx");
  const cdCount = u16(dv, eocd + 10);
  const cdOffset = u32(dv, eocd + 16);

  // 2) Walk the central directory for word/document.xml.
  let p = cdOffset;
  let target: { method: number; compSize: number; localOffset: number } | null = null;
  for (let n = 0; n < cdCount; n++) {
    if (u32(dv, p) !== 0x02014b50) break; // central dir header signature
    const method = u16(dv, p + 10);
    const compSize = u32(dv, p + 20);
    const nameLen = u16(dv, p + 28);
    const extraLen = u16(dv, p + 30);
    const commentLen = u16(dv, p + 32);
    const localOffset = u32(dv, p + 42);
    const name = DEC.decode(buf.subarray(p + 46, p + 46 + nameLen));
    if (name === "word/document.xml") {
      target = { method, compSize, localOffset };
      break;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (!target) throw new Error("no-document-xml");

  // 3) Find the entry data via its local header, then read/inflate it.
  const lo = target.localOffset;
  if (u32(dv, lo) !== 0x04034b50) throw new Error("bad-local-header");
  const dataStart = lo + 30 + u16(dv, lo + 26) + u16(dv, lo + 28);
  const comp = buf.subarray(dataStart, dataStart + target.compSize);
  const xmlBytes = target.method === 0 ? comp : await inflateRaw(comp);
  const xml = DEC.decode(xmlBytes);

  const text = xmlToText(xml);
  if (text.length < 10) throw new Error("empty-docx-text");
  return text;
}

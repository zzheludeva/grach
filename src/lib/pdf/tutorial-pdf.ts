"use client";
import type { jsPDF as JsPDF } from "jspdf";
import type { Tutorial } from "@/lib/types";

/**
 * Builds a print-ready PDF of a tutorial's content (not the page UI): title, meta, summary, cover,
 * detailed text with light structure (headings, lists, **bold**), gallery, numbered steps with images,
 * materials, video and links. A4, Raleway Regular/Bold embedded (full Cyrillic + Latin), page numbers.
 * jsPDF is loaded on demand, so it doesn't weigh on the page bundle.
 */

export interface TutorialPdfLabels {
  brand: string;
  meta: string; // "Ceramics · Beginner · 2 h"
  author: string; // "Author: Marina"
  materials: string;
  steps: string;
  gallery: string;
  video: string;
  links: string;
  page: (n: number, total: number) => string;
  source: string; // "Exported from GRACH · date"
}

const MM = { w: 210, h: 297, side: 18, top: 18, bottom: 20 };
const C = { ink: [21, 72, 76], text: [19, 39, 42], muted: [88, 107, 109], rust: [190, 99, 52], saffron: [255, 159, 0], line: [231, 227, 221], soft: [227, 238, 238] } as const;
type RGB = readonly [number, number, number];

async function fileToBase64(url: string) {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

interface LoadedImage { data: string; w: number; h: number }
/** Loads any same-origin or data: image and re-encodes it as JPEG (max 1600 px) for a compact PDF. */
function loadImage(src: string): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k));
        const h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: c.toDataURL("image/jpeg", 0.85), w, h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

type Run = { text: string; bold: boolean };
/** "**bold** text" → runs. */
function parseInline(s: string): Run[] {
  const out: Run[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  return out;
}

type Block =
  | { kind: "h"; text: string; level: 1 | 2 }
  | { kind: "p"; text: string }
  | { kind: "li"; text: string; marker: string };
/** Plain text with light structure: "# Heading", "## Sub", "- item" / "• item", "1. item", blank lines. */
export function parseContent(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ").trim() });
    para = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,3})\s+(.+)$/))) { flush(); blocks.push({ kind: "h", text: m[2], level: m[1].length === 1 ? 1 : 2 }); continue; }
    if ((m = line.match(/^[-–•*]\s+(.+)$/))) { flush(); blocks.push({ kind: "li", text: m[1], marker: "•" }); continue; }
    if ((m = line.match(/^(\d{1,3})[.)]\s+(.+)$/))) { flush(); blocks.push({ kind: "li", text: m[2], marker: `${m[1]}.` }); continue; }
    // A short line ending with ":" works as a subheading.
    if (line.length <= 60 && /[:：]$/.test(line) && !para.length) { flush(); blocks.push({ kind: "h", text: line.replace(/[:：]$/, ""), level: 2 }); continue; }
    para.push(line);
  }
  flush();
  return blocks;
}

export async function exportTutorialPdf(tut: Tutorial, steps: Tutorial["steps"], labels: TutorialPdfLabels, fileName: string) {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const [reg, bold] = await Promise.all([fileToBase64("/fonts/Raleway-Regular.ttf"), fileToBase64("/fonts/Raleway-Bold.ttf")]);
  doc.addFileToVFS("Raleway-Regular.ttf", reg);
  doc.addFileToVFS("Raleway-Bold.ttf", bold);
  doc.addFont("Raleway-Regular.ttf", "Raleway", "normal");
  doc.addFont("Raleway-Bold.ttf", "Raleway", "bold");
  doc.setProperties({ title: tut.title, subject: tut.summary, creator: labels.brand });
  doc.setLanguage((tut.lang || "ru") as Parameters<JsPDF["setLanguage"]>[0]);

  const W = MM.w - MM.side * 2;
  let y = MM.top;
  const bottom = MM.h - MM.bottom;
  const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (b: boolean, size: number) => {
    doc.setFont("Raleway", b ? "bold" : "normal");
    doc.setFontSize(size);
  };
  const lh = (size: number, k = 1.45) => (size * 0.3528) * k; // pt → mm line height
  const newPage = () => { doc.addPage(); y = MM.top; };
  const ensure = (h: number) => { if (y + h > bottom) newPage(); };

  /** Word-wraps mixed regular/bold runs into lines that fit `width`. Very long words are split. */
  const wrapRuns = (runs: Run[], size: number, width: number) => {
    type Piece = { text: string; bold: boolean; w: number };
    const lines: Piece[][] = [[]];
    let lineW = 0;
    const space = (b: boolean) => { font(b, size); return doc.getTextWidth(" "); };
    for (const r of runs) {
      const words = r.text.split(/(\s+)/).filter((x) => x !== "");
      for (const word of words) {
        if (/^\s+$/.test(word)) {
          if (lines[lines.length - 1].length) lineW += space(r.bold), lines[lines.length - 1].push({ text: " ", bold: r.bold, w: space(r.bold) });
          continue;
        }
        font(r.bold, size);
        let rest = word;
        while (rest) {
          let ww = doc.getTextWidth(rest);
          if (lineW + ww <= width) {
            lines[lines.length - 1].push({ text: rest, bold: r.bold, w: ww });
            lineW += ww;
            rest = "";
          } else if (lineW > 0) {
            // trim trailing space and start a new line
            const cur = lines[lines.length - 1];
            while (cur.length && cur[cur.length - 1].text === " ") cur.pop();
            lines.push([]);
            lineW = 0;
          } else {
            // word longer than the line: split by characters with a hyphen
            let n = rest.length;
            while (n > 1 && doc.getTextWidth(rest.slice(0, n) + "-") > width) n--;
            const head = rest.slice(0, n) + "-";
            ww = doc.getTextWidth(head);
            lines[lines.length - 1].push({ text: head, bold: r.bold, w: ww });
            lines.push([]);
            lineW = 0;
            rest = rest.slice(n);
          }
        }
      }
    }
    return lines.map((l) => { while (l.length && l[l.length - 1].text === " ") l.pop(); return l; }).filter((l, i, a) => l.length || i < a.length - 1);
  };

  /** Height a paragraph will take, without drawing it. */
  const measure = (text: string, size: number, indent: number, boldAll = false, k?: number) =>
    wrapRuns(boldAll ? [{ text, bold: true }] : parseInline(text), size, W - indent).length * lh(size, k);

  const paragraph = (text: string, opts: { size?: number; c?: RGB; indent?: number; boldAll?: boolean; gapAfter?: number; k?: number } = {}) => {
    const size = opts.size ?? 11;
    const x0 = MM.side + (opts.indent ?? 0);
    const runs = opts.boldAll ? [{ text, bold: true }] : parseInline(text);
    const lines = wrapRuns(runs, size, W - (opts.indent ?? 0));
    const h = lh(size, opts.k);
    for (const line of lines) {
      ensure(h);
      let x = x0;
      color(opts.c ?? C.text);
      for (const p of line) {
        font(p.bold, size);
        doc.text(p.text, x, y + h * 0.72);
        x += p.w;
      }
      y += h;
    }
    y += opts.gapAfter ?? 2.2;
  };

  const heading = (text: string, level: 1 | 2) => {
    const size = level === 1 ? 15 : 12.5;
    ensure(lh(size) + 12); // keep the heading with at least a line of the following text
    y += level === 1 ? 3 : 1.5;
    paragraph(text, { size, c: C.ink, boldAll: true, gapAfter: level === 1 ? 2.5 : 1.5, k: 1.3 });
  };

  const sectionTitle = (text: string) => {
    ensure(22);
    y += 4;
    doc.setFillColor(C.saffron[0], C.saffron[1], C.saffron[2]);
    // small diamond marker, like the section titles in the app
    const cy = y + 3.2;
    doc.triangle(MM.side + 1.6, cy - 1.6, MM.side + 3.2, cy, MM.side, cy, "F");
    doc.triangle(MM.side, cy, MM.side + 3.2, cy, MM.side + 1.6, cy + 1.6, "F");
    font(true, 14);
    color(C.ink);
    doc.text(text, MM.side + 6, y + 4.6);
    y += 8;
    doc.setDrawColor(C.line[0], C.line[1], C.line[2]);
    doc.setLineWidth(0.3);
    doc.line(MM.side, y, MM.side + W, y);
    y += 4;
  };

  const listItem = (text: string, marker: string, size = 11) => {
    const h = lh(size);
    ensure(h);
    font(marker === "•" ? false : true, size);
    color(marker === "•" ? C.rust : C.ink);
    doc.text(marker, MM.side + 1.5, y + h * 0.72);
    paragraph(text, { size, indent: 7, gapAfter: 1 });
  };

  const image = async (src: string, maxW: number, maxH: number, x = MM.side) => {
    const img = await loadImage(src);
    if (!img) return 0;
    const k = Math.min(maxW / img.w, maxH / img.h);
    const w = img.w * k;
    const h = img.h * k;
    ensure(h + 2);
    doc.addImage(img.data, "JPEG", x, y, w, h, undefined, "FAST");
    return h;
  };

  /* ---------- header ---------- */
  font(true, 9);
  color(C.rust);
  doc.text(labels.brand.toUpperCase(), MM.side, y + 3);
  font(false, 9);
  color(C.muted);
  doc.text(labels.meta, MM.side + W, y + 3, { align: "right", maxWidth: W - 30 });
  y += 9;
  paragraph(tut.title, { size: 22, c: C.ink, boldAll: true, k: 1.2, gapAfter: 1.5 });
  paragraph(labels.author, { size: 10, c: C.muted, gapAfter: 3 });
  if (tut.summary) paragraph(tut.summary, { size: 12, c: C.text, gapAfter: 4 });

  if (tut.cover) {
    const h = await image(tut.cover, W, 105);
    if (h) y += h + 6;
  }

  /* ---------- materials ---------- */
  if (tut.materials.length) {
    sectionTitle(labels.materials);
    for (const m of tut.materials) listItem(m, "•", 10.5);
    y += 2;
  }

  /* ---------- detailed content ---------- */
  if (tut.content?.trim()) {
    y += 2;
    for (const b of parseContent(tut.content)) {
      if (b.kind === "h") heading(b.text, b.level);
      else if (b.kind === "li") listItem(b.text, b.marker);
      else paragraph(b.text, { gapAfter: 3 });
    }
  }

  /* ---------- gallery: two per row ---------- */
  if (tut.images?.length) {
    const colW = (W - 5) / 2;
    const all = await Promise.all(tut.images.map(loadImage));
    const rowHeight = (i: number) => Math.max(0, ...all.slice(i, i + 2).map((img) => (img ? Math.min(colW / img.w, 75 / img.h) * img.h : 0)));
    if (y + 20 + rowHeight(0) > bottom) newPage(); // title together with the first row
    sectionTitle(labels.gallery);
    for (let i = 0; i < tut.images.length; i += 2) {
      const pair = all.slice(i, i + 2);
      const hs = pair.map((img) => (img ? Math.min(colW / img.w, 75 / img.h) * img.h : 0));
      const rowH = Math.max(...hs, 0);
      if (!rowH) continue;
      ensure(rowH + 4);
      pair.forEach((img, k) => {
        if (!img) return;
        const s = Math.min(colW / img.w, 75 / img.h);
        doc.addImage(img.data, "JPEG", MM.side + k * (colW + 5), y, img.w * s, img.h * s, undefined, "FAST");
      });
      y += rowH + 5;
    }
  }

  /* ---------- steps ---------- */
  if (steps.length) {
    const stepImgs = await Promise.all(steps.map((st) => (st.image ? loadImage(st.image) : Promise.resolve(null))));
    const imgW = Math.min(120, W - 11);
    const imgHOf = (img: LoadedImage | null) => (img ? Math.min(imgW / img.w, 85 / img.h) * img.h : 0);
    const stepHeight = (i: number) => {
      const st = steps[i];
      const textH =
        measure(st.title || `${i + 1}`, 12.5, 11, true, 1.3) + 1 +
        (st.text ? parseContent(st.text).reduce((h, b) => h + measure(b.text, 11, b.kind === "li" ? 17 : 11, b.kind === "h") + 2, 0) : 0);
      return Math.max(textH, 9) + (stepImgs[i] ? imgHOf(stepImgs[i]) + 3 : 0) + 4;
    };
    const page = bottom - MM.top;
    // The section title goes to the next page together with the first step if they don't fit here.
    if (y + 20 + Math.min(stepHeight(0), page - 20) > bottom) newPage();
    sectionTitle(labels.steps);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const img = stepImgs[i];
      const imgH = imgHOf(img);
      // Keep a step (title, text, photo) on one page when it fits on a page at all.
      const stepH = stepHeight(i);
      if (y + stepH > bottom && stepH <= page) newPage();
      else ensure(24);
      // number badge
      doc.setFillColor(C.soft[0], C.soft[1], C.soft[2]);
      doc.circle(MM.side + 4, y + 4, 4, "F");
      font(true, 10.5);
      color(C.ink);
      doc.text(String(i + 1), MM.side + 4, y + 5.4, { align: "center" });
      const top = y;
      paragraph(s.title || `${i + 1}`, { size: 12.5, c: C.ink, boldAll: true, indent: 11, gapAfter: 1, k: 1.3 });
      if (y < top + 9) y = top + 9;
      if (s.text) {
        for (const b of parseContent(s.text)) {
          if (b.kind === "li") listItemIndented(b.text, b.marker);
          else paragraph(b.text, { indent: 11, gapAfter: 2, size: b.kind === "h" ? 11.5 : 11, boldAll: b.kind === "h" });
        }
      }
      if (img) {
        ensure(imgH + 2);
        doc.addImage(img.data, "JPEG", MM.side + 11, y, img.w * (imgH / img.h), imgH, undefined, "FAST");
        y += imgH + 3;
      }
      y += 4;
    }
  }
  function listItemIndented(text: string, marker: string) {
    const size = 11;
    const h = lh(size);
    ensure(h);
    font(false, size);
    color(C.rust);
    doc.text(marker, MM.side + 12, y + h * 0.72);
    paragraph(text, { size, indent: 17, gapAfter: 1 });
  }

  /* ---------- video and links ---------- */
  const links = [...(tut.videoUrl ? [{ label: labels.video, url: tut.videoUrl }] : []), ...(tut.links ?? [])];
  if (links.length) {
    sectionTitle(labels.links);
    for (const l of links) {
      ensure(lh(11) * 2 + 2);
      font(true, 11);
      color(C.ink);
      doc.text(l.label, MM.side, y + 4);
      y += lh(11);
      font(false, 9.5);
      color([48, 140, 136]);
      const url = doc.splitTextToSize(l.url, W) as string[];
      for (const u of url) {
        ensure(lh(9.5));
        doc.textWithLink(u, MM.side, y + 3.4, { url: l.url });
        y += lh(9.5);
      }
      y += 2;
    }
  }

  /* ---------- footer with page numbers on every page ---------- */
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(C.line[0], C.line[1], C.line[2]);
    doc.setLineWidth(0.3);
    doc.line(MM.side, MM.h - 13, MM.side + W, MM.h - 13);
    font(false, 8.5);
    color(C.muted);
    const left = doc.splitTextToSize(`${labels.brand} · ${tut.title}`, W - 40)[0] as string;
    doc.text(left, MM.side, MM.h - 8.5);
    doc.text(labels.page(p, total), MM.side + W, MM.h - 8.5, { align: "right" });
    if (p === total) {
      font(false, 7.5);
      doc.text(labels.source, MM.side, MM.h - 4.5);
    }
  }

  doc.save(fileName);
}

/** Safe file name from the title (keeps Cyrillic). */
export function pdfFileName(title: string) {
  const base = title.replace(/[\\/:*?"<>|«»]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "tutorial";
  return `${base}.pdf`;
}

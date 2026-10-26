/* Web Docente · utilidades sin dependencias: ZIP, Excel (.xlsx), IndexedDB, descargas */
(function (WD) {
  'use strict';
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /* ---------- texto y fechas ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaLarga = (s) => { const d = parseISO(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
  const lunesDe = (d) => { const x = new Date(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const round1 = (n) => Math.round(n * 10) / 10;

  /* ---------- CRC32 ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

  /* ---------- ZIP (escritura con compresión si el navegador la tiene) ---------- */
  async function deflateRaw(u8) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
      const cs = new CompressionStream('deflate-raw');
      const out = await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer();
      return new Uint8Array(out);
    } catch (e) { return null; }
  }
  async function inflateRaw(u8) {
    const ds = new DecompressionStream('deflate-raw');
    const out = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(out);
  }
  async function zipFiles(files) { // files: [{name, data: string|Uint8Array}]
    const chunks = []; const central = []; let offset = 0;
    const now = new Date();
    const dtime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const ddate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const f of files) {
      const name = enc.encode(f.name);
      const raw = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(raw);
      let data = raw, method = 0;
      if (raw.length > 256) { const c = await deflateRaw(raw); if (c && c.length < raw.length) { data = c; method = 8; } }
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, method, true);
      lh.setUint16(10, dtime, true); lh.setUint16(12, ddate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, raw.length, true); lh.setUint16(26, name.length, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, method, true);
      ch.setUint16(12, dtime, true); ch.setUint16(14, ddate, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, raw.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const csize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }
  async function unzip(buf) { // devuelve {nombre: Uint8Array}
    const u8 = new Uint8Array(buf); const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('El archivo no es un ZIP/Excel válido.');
    const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
    for (let i = 0; i < count; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      const lstart = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      const data = u8.subarray(lstart, lstart + csize);
      out[name] = method === 8 ? await inflateRaw(data) : data.slice();
      p += 46 + nlen + xlen + clen;
    }
    return out;
  }

  /* ---------- Excel .xlsx (escritura) ---------- */
  const xmlEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const colName = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  // sheets: [{name, rows: [[...]], widths?: [n], headerRows?: 1}]
  async function xlsxBlob(sheets) {
    const files = [];
    const sheetXml = (sh) => {
      const hr = sh.headerRows ?? 1;
      const cols = (sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
      const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
        const ref = colName(ci) + (ri + 1); const st = ri < hr ? ' s="1"' : '';
        if (v === null || v === undefined || v === '') return `<c r="${ref}"${st}/>`;
        if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
        return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
      }).join('') + '</row>').join('');
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${hr ? `<pane ySplit="${hr}" topLeftCell="A${hr + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows}</sheetData></worksheet>`;
    };
    files.push({ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` });
    files.push({ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` });
    files.push({ name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(s.name.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` });
    files.push({ name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8E8E6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>` });
    sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }));
    const z = await zipFiles(files);
    return new Blob([z], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------- Excel .xlsx / .csv (lectura de la primera hoja) ---------- */
  async function readSheet(file) {
    const buf = await file.arrayBuffer();
    if (/\.csv$/i.test(file.name)) return parseCSV(dec.decode(buf));
    const z = await unzip(buf);
    const parser = new DOMParser();
    const shared = [];
    if (z['xl/sharedStrings.xml']) {
      const d = parser.parseFromString(dec.decode(z['xl/sharedStrings.xml']), 'application/xml');
      d.querySelectorAll('si').forEach((si) => shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent).join('')));
    }
    let sheetPath = 'xl/worksheets/sheet1.xml';
    if (!z[sheetPath]) sheetPath = Object.keys(z).find((k) => /^xl\/worksheets\/.*\.xml$/.test(k));
    if (!sheetPath) throw new Error('No encontré hojas dentro del archivo.');
    const d = parser.parseFromString(dec.decode(z[sheetPath]), 'application/xml');
    const rows = [];
    d.querySelectorAll('sheetData > row').forEach((r) => {
      const ri = Number(r.getAttribute('r')) - 1; const row = [];
      r.querySelectorAll('c').forEach((c) => {
        const ref = c.getAttribute('r') || ''; const letters = ref.replace(/\d+/g, '');
        let ci = 0; for (const ch of letters) ci = ci * 26 + (ch.charCodeAt(0) - 64); ci -= 1;
        const t = c.getAttribute('t'); const v = c.querySelector('v'); let val = '';
        if (t === 's') val = shared[Number(v?.textContent)] ?? '';
        else if (t === 'inlineStr') val = Array.from(c.getElementsByTagName('t')).map((x) => x.textContent).join('');
        else val = v ? v.textContent : '';
        row[ci < 0 ? row.length : ci] = val;
      });
      rows[ri] = row;
    });
    return Array.from(rows, (r) => Array.from(r || [], (x) => x ?? ''));
  }
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  // Fecha serial de Excel → AAAA-MM-DD
  const excelDate = (v) => {
    if (v === '' || v == null) return '';
    if (/^\d+(\.\d+)?$/.test(String(v)) && Number(v) > 10000) { const d = new Date(Math.round((Number(v) - 25569) * 86400000)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
    const m = String(v).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
    return String(v);
  };

  /* ---------- Word .docx → texto ---------- */
  async function docxText(file) {
    const z = await unzip(await file.arrayBuffer());
    const xml = z['word/document.xml']; if (!xml) throw new Error('No pude leer el documento de Word.');
    const d = new DOMParser().parseFromString(dec.decode(xml), 'application/xml');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const out = [];
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.namespaceURI === W && n.localName === 'p') { out.push(Array.from(n.getElementsByTagNameNS(W, 't')).map((t) => t.textContent).join('')); }
        else if (n.namespaceURI === W && n.localName === 'tbl') {
          for (const tr of n.getElementsByTagNameNS(W, 'tr')) out.push(Array.from(tr.getElementsByTagNameNS(W, 'tc')).map((tc) => Array.from(tc.getElementsByTagNameNS(W, 't')).map((t) => t.textContent).join('')).join(' | '));
        } else if (n.childNodes && n.childNodes.length) walk(n);
      }
    };
    walk(d.documentElement);
    return out.filter((l) => l.trim()).join('\n');
  }

  /* ---------- descargas y archivos ---------- */
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const fileToDataURL = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  async function shrinkImage(file, max = 1400, q = 0.82) {
    const url = await fileToDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }

  /* ---------- IndexedDB (llave-valor) ---------- */
  let dbp = null;
  const idb = () => dbp || (dbp = new Promise((res, rej) => {
    try { const r = indexedDB.open('web-docente', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (e) { rej(e); }
  }));
  const kv = {
    async get(k) { try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { try { const v = localStorage.getItem('wd:' + k); return v ? JSON.parse(v) : undefined; } catch (_) { return undefined; } } },
    async set(k, v) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { try { localStorage.setItem('wd:' + k, JSON.stringify(v)); } catch (_) {} } },
    async del(k) { try { const db = await idb(); await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = res; t.onerror = res; }); } catch (e) {} try { localStorage.removeItem('wd:' + k); } catch (_) {} },
    async keys() { try { const db = await idb(); return await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]); }); } catch (e) { return []; } },
  };

  Object.assign(WD, { esc, uid, pad, iso, parseISO, DIAS, MESES, fechaLarga, lunesDe, addDays, norm, round1, zipFiles, unzip, xlsxBlob, readSheet, parseCSV, excelDate, docxText, download, fileToDataURL, shrinkImage, kv, crc32 });
})(window.WD = window.WD || {});

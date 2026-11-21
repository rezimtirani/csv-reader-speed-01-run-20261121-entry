// Fast drop-in for csv-reader 1.0.0 (make.fun's own CSV reader).
//
// Same answer as csv-reader 1.0.0 for every input {text, header}: {columns, rows, errors}.
// Same broken-row policy, implemented with slice/indexOf jumps instead of one
// character at a time:
//
//   - a U+FEFF at the very start of the text is dropped;
//   - a record ends at LF or CRLF, and a line left with no characters is no record;
//   - outside a quoted field a CR not followed by LF is dropped (stray_cr);
//   - a field that opens with a quote runs to the next quote that is not doubled,
//     "" inside it one quote, each CRLF or lone CR inside it read as LF; what
//     follows its closing quote, up to the next comma or line break, is appended
//     as it stands (quote_junk, when the field ends); a quote that never closes
//     is a literal character, and the text after it is read again as unquoted
//     (unterminated_quote);
//   - a quote inside an unquoted field is a literal character; fields stay
//     strings, never trimmed or converted;
//   - columns is the first record when header is true, else null; rows holds the
//     records after it (every record when header is false), each padded with ""
//     (short_row, with fields: its field count) or cut (long_row, with extra:
//     the cut fields) to the first record's width;
//   - each error is {code, line, row}: line the 1-based line its record starts
//     on (every LF, CRLF and lone CR inside a quoted field counted), row its
//     record's index in rows (null for the header), in the order met.
//
// Speed notes: unquoted fields are sliced out of the text in one go (the scan
// only looks for , LF CR), quoted fields jump from quote to quote with indexOf,
// and quoted segments are only normalised when they actually hold a CR or LF.
// No per-character string building, no per-character function calls.
//
// Pure: no clock, no randomness, no locale, nothing kept from one call to the next.

// How a field ended.
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** Count of '\n' in s. */
function countLF(s) {
  let n = 0;
  let i = -1;
  while ((i = s.indexOf('\n', i + 1)) !== -1) n++;
  return n;
}

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const len = text.length;
  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (len > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  // A quoted segment as it stands in the answer: CRLF and lone CR inside quotes
  // are each one LF, and every line break inside quotes counts a line.
  function addSeg(seg) {
    if (seg.indexOf('\r') === -1) {
      if (seg.indexOf('\n') !== -1) line += countLF(seg);
      return seg;
    }
    const norm = seg.replace(/\r\n?/g, '\n');
    line += countLF(norm);
    return norm;
  }

  // Reads unquoted characters from pos up to the next comma or line break, onto
  // `prefix` (null: a fresh field). A CR not followed by LF is dropped
  // (stray_cr). Returns the field and how it ended.
  function readUnquoted(prefix) {
    let value = prefix;
    let start = pos;
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 44) { // ,
        const f = text.slice(start, pos);
        pos += 1;
        return { value: value === null ? f : value + f, ended: COMMA };
      }
      if (c === 10) { // LF
        const f = text.slice(start, pos);
        pos += 1;
        line += 1;
        return { value: value === null ? f : value + f, ended: LINE_BREAK };
      }
      if (c === 13) { // CR
        if (text.charCodeAt(pos + 1) === 10) {
          const f = text.slice(start, pos);
          pos += 2;
          line += 1;
          return { value: value === null ? f : value + f, ended: LINE_BREAK };
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        value = (value === null ? '' : value) + text.slice(start, pos);
        pos += 1;
        start = pos;
        continue;
      }
      pos += 1;
    }
    const f = text.slice(start, pos);
    return { value: value === null ? f : value + f, ended: END };
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    pos += 1;
    let parts = null;
    let segStart = pos;
    while (true) {
      const q = text.indexOf('"', pos);
      if (q === -1) {
        // The quote never closes: it is a literal character, and the text after
        // it is read again as an unquoted field.
        pos = open + 1;
        line = openLine;
        errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        return readUnquoted('"');
      }
      if (text.charCodeAt(q + 1) === 34) {
        // A doubled quote: one quote in the value, and the field goes on.
        const seg = addSeg(text.slice(segStart, q));
        parts = (parts === null ? seg : parts + seg) + '"';
        pos = q + 2;
        segStart = pos;
        continue;
      }
      // The closing quote.
      const seg = addSeg(text.slice(segStart, q));
      const value = parts === null ? seg : parts + seg;
      pos = q + 1;
      if (pos >= len) return { value, ended: END };
      const c = text.charCodeAt(pos);
      if (c === 44) { // ,
        pos += 1;
        return { value, ended: COMMA };
      }
      if (c === 10) { // LF
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK };
      }
      if (c === 13 && text.charCodeAt(pos + 1) === 10) { // CRLF
        pos += 2;
        line += 1;
        return { value, ended: LINE_BREAK };
      }
      // What follows the closing quote is appended as it stands, up to the next
      // comma or line break.
      const junk = readUnquoted(value);
      if (junk.value.length > value.length) {
        errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
      }
      return junk;
    }
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted(null);
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}

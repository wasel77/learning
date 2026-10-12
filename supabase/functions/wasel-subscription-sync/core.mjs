export function normalizeEmail(v) {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

export function validEmail(v) {
  if (typeof v !== "string" || v.length > 254) return false;
  const parts = v.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && local.length <= 64
    && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
    && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..")
    && domain.includes(".")
    && domain.split(".").every((x) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x));
}

function iso(y, m, d) {
  if (y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? dt.toISOString().slice(0, 10)
    : null;
}

export function parseExpiry(v, date1904 = false) {
  if (typeof v === "number" && Number.isFinite(v)) {
    const days = Math.floor(v);
    if (days < 0 || days > 2958465 || (!date1904 && days === 60)) return null;
    const base = date1904
      ? Date.UTC(1904, 0, 1)
      : days < 60
        ? Date.UTC(1899, 11, 31)
        : Date.UTC(1899, 11, 30);
    const dt = new Date(base + days * 86400000);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  if (typeof v !== "string") return null;
  let a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (a) return iso(+a[1], +a[2], +a[3]);
  // The workbook's text dates are day/month/year, matching its Excel formulas.
  a = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
  return a ? iso(+a[3], +a[2], +a[1]) : null;
}

export function parseRows(matrix, date1904 = false) {
  const requiredHeaders = ["الايميل", "Expired date", "names", "الباقه"];
  const headers = [];
  matrix.slice(0, 50).forEach((row, index) => {
    const labels = row.map((value) => typeof value === "string" ? value.trim() : "");
    if (requiredHeaders.every((required) => labels.includes(required))) headers.push(index);
  });
  if (headers.length !== 1) throw new Error("missing_or_ambiguous_header");
  const headerIndex = headers[0];
  const header = matrix[headerIndex].map((value) => typeof value === "string" ? value.trim() : "");
  for (const required of requiredHeaders) {
    if (header.filter((value) => value === required).length !== 1) {
      throw new Error("missing_or_duplicate_column");
    }
  }
  const emailColumn = header.indexOf("الايميل");
  const expiryColumn = header.indexOf("Expired date");
  const nameColumn = header.indexOf("names");
  const packageColumn = header.indexOf("الباقه");
  const exceptions = [];
  const raw = [];
  let excelRows = 0;
  let emailCount = 0;
  for (let index = headerIndex + 1; index < matrix.length; index++) {
    const row = matrix[index];
    const emailValue = row[emailColumn];
    const expiryValue = row[expiryColumn];
    const nameValue = row[nameColumn];
    const empty = (value) => value == null || typeof value === "string" && value.trim() === "";
    if (empty(emailValue) && empty(expiryValue) && empty(nameValue)) continue;
    excelRows++;
    const email = normalizeEmail(emailValue);
    const expiry = parseExpiry(expiryValue, date1904);
    const packageValue = typeof row[packageColumn] === "string" ? row[packageColumn].trim() : "";
    if (!empty(emailValue)) emailCount++;
    const reasons = [];
    if (empty(emailValue)) reasons.push("missing_email");
    else if (!validEmail(email)) reasons.push("invalid_email");
    if (!expiry) reasons.push(empty(expiryValue) ? "missing_expiry" : "invalid_expiry");
    if (packageValue !== "Bronz" && packageValue !== "Diamond") {
      reasons.push(empty(row[packageColumn]) ? "missing_package" : "invalid_package");
    }
    raw.push({ email, expiry, packageValue, row_no: index + 1, reasons });
  }
  const counts = new Map();
  raw.forEach((row) => {
    if (row.email) counts.set(row.email, (counts.get(row.email) || 0) + 1);
  });
  const rows = [];
  for (const row of raw) {
    if (row.email && counts.get(row.email) > 1) row.reasons.push("duplicate_excel_email");
    if (row.reasons.length) exceptions.push({ row: row.row_no, reasons: row.reasons });
    else {
      rows.push({
        email: row.email,
        expiry: row.expiry,
        package: row.packageValue === "Bronz" ? "bronze" : "diamond",
        row_no: row.row_no,
      });
    }
  }
  if (!excelRows || !rows.length) throw new Error("empty_or_no_valid_source_rows");
  return { rows, exceptions, excel_rows: excelRows, email_count: emailCount };
}

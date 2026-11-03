const { HttpError } = require('./router');

const CATEGORIES = ['Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Books', 'Other'];
const ROLES = ['customer', 'seller'];

const bad = (msg) => new HttpError(400, msg);
const str = (v, name, min, max) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min || s.length > max) throw bad(`${name} must be ${min}-${max} characters`);
  return s;
};

function validateRegister(b) {
  const email = str(b.email, 'Email', 5, 120).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Email address is not valid');
  if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 100) throw bad('Password must be at least 8 characters');
  if (!ROLES.includes(b.role)) throw bad('Role must be customer or seller');
  return { name: str(b.name, 'Name', 2, 60), email, password: b.password, role: b.role };
}

function validateProduct(b) {
  const price = Number(b.price);
  if (!Number.isFinite(price) || price <= 0 || price > 10000000) throw bad('Price must be a positive number');
  if (!CATEGORIES.includes(b.category)) throw bad('Unknown category');
  let attrs = b.attributes;
  if (typeof attrs === 'string') attrs = attrs.split(',');
  attrs = (Array.isArray(attrs) ? attrs : []).map((a) => String(a).trim()).filter(Boolean).slice(0, 10);
  if (attrs.some((a) => a.length > 40)) throw bad('Each attribute must be at most 40 characters');
  return {
    title: str(b.title, 'Title', 3, 120),
    brand: str(b.brand, 'Brand', 1, 60),
    category: b.category,
    price: Math.round(price),
    description: str(b.description ?? '', 'Description', 0, 1000),
    attributes: attrs,
  };
}

// Decode a data URL and verify it really is a JPEG / PNG / WebP (by magic bytes, not by name).
function decodeImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!m) throw bad('Upload a JPEG, PNG or WebP image');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length === 0 || buf.length > 5 * 1024 * 1024) throw bad('Image must be smaller than 5 MB');
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  const ext = isJpeg ? 'jpg' : isPng ? 'png' : isWebp ? 'webp' : null;
  if (!ext) throw bad('File content is not a valid JPEG, PNG or WebP image');
  return { buffer: buf, ext };
}

module.exports = { validateRegister, validateProduct, decodeImage, CATEGORIES };

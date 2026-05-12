const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'data', 'db.json');
const UPLOAD_DIR = path.join(ROOT, 'imagines', 'uploads');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

// --- AUTHORIZATION ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : '2104');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_COOKIE_NAME = 'bakery_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const loginAttempts = new Map();

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    process.env.NODE_ENV === 'production'
      ? 'ADMIN_PASSWORD is not set. Admin login is disabled.'
      : 'ADMIN_PASSWORD is not set. Using local development fallback password.'
  );
}
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set. Sessions will reset when the server restarts.');
}

function parseCookies(req) {
  const safeDecode = (value) => {
    try {
      return decodeURIComponent(value);
    } catch (_) {
      return value;
    }
  };

  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf('=');
        return index === -1
          ? [safeDecode(item), '']
          : [safeDecode(item.slice(0, index)), safeDecode(item.slice(index + 1))];
      })
  );
}

function signSessionPayload(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function createSessionToken() {
  const payload = `${Date.now()}.${crypto.randomBytes(24).toString('base64url')}`;
  return `${payload}.${signSessionPayload(payload)}`;
}

function verifySessionToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const signature = parts[2];
  const expected = signSessionPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  const issuedAt = Number(parts[0]);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt <= SESSION_TTL_MS;
}

function isHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
}

function buildCookie(value, req, maxAgeSeconds) {
  const secure = isHttps(req) || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

function setAuthCookie(req, res) {
  res.setHeader('Set-Cookie', buildCookie(createSessionToken(), req, Math.floor(SESSION_TTL_MS / 1000)));
}

function clearAuthCookie(req, res) {
  res.setHeader('Set-Cookie', buildCookie('', req, 0));
}

function isAuthenticated(req) {
  return verifySessionToken(parseCookies(req)[SESSION_COOKIE_NAME]);
}

function requireAdmin(req, res) {
  if (isAuthenticated(req)) return true;
  sendText(res, 403, 'Access denied');
  return false;
}

function getClientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim();
}

function isLoginLimited(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now > record.resetAt) return false;
  return record.count >= 5;
}

function recordFailedLogin(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  record.count += 1;
}

function clearFailedLogins(req) {
  loginAttempts.delete(getClientKey(req));
}

function safePasswordEquals(input) {
  if (!ADMIN_PASSWORD) return false;
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(String(ADMIN_PASSWORD));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({ settings: {}, products: [] }), 'utf8');
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function collectBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    || crypto.randomUUID();
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('Немає boundary для multipart/form-data');

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = [];
  let start = buffer.indexOf(boundary) + boundary.length + 2;

  while (start > boundary.length) {
    const next = buffer.indexOf(boundary, start);
    if (next < 0) break;

    const part = buffer.subarray(start, next - 2);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd > -1) {
      const rawHeaders = part.subarray(0, headerEnd).toString('utf8');
      const body = part.subarray(headerEnd + 4);
      const name = rawHeaders.match(/name="([^"]+)"/)?.[1];
      const filename = rawHeaders.match(/filename="([^"]*)"/)?.[1];
      const type = rawHeaders.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream';
      if (name) parts.push({ name, filename, type, body });
    }
    start = next + boundary.length + 2;
  }
  return parts;
}

async function handleApi(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/login') {
    if (isLoginLimited(req)) {
      sendText(res, 429, 'Too many login attempts. Try again later.');
      return true;
    }

    try {
      const body = await collectBody(req, 16 * 1024);
      const { password } = JSON.parse(body.toString('utf8') || '{}');

      if (safePasswordEquals(password)) {
        clearFailedLogins(req);
        setAuthCookie(req, res);
        sendJson(res, 200, { success: true });
      } else {
        recordFailedLogin(req);
        sendText(res, 401, 'Invalid credentials');
      }
    } catch (_) {
      sendText(res, 400, 'Bad request');
    }
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    clearAuthCookie(req, res);
    sendJson(res, 200, { success: true });
    return true;
  }

  const protectedRoutes = ['/api/products', '/api/settings/news'];
  if (protectedRoutes.includes(url.pathname) && req.method !== 'GET' && !requireAdmin(req, res)) {
    return true;
  }

  const db = readDb();

  if (req.method === 'GET' && url.pathname === '/api/settings/news') {
    const newsData = typeof db.settings.news === 'object' 
         ? db.settings.news 
         : { text: db.settings.news || '' };
    sendJson(res, 200, newsData);
    return true;
  }

  // --- ВАЖЛИВО: Оновлення новини + фото (POST замість старого PUT) ---
  if (req.method === 'POST' && url.pathname === '/api/settings/news') {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      sendText(res, 415, 'Очікується multipart/form-data');
      return true;
    }

    const parts = parseMultipart(await collectBody(req), contentType);
    const textPart = parts.find(p => p.name === 'news');
    const imagePart = parts.find(p => p.name === 'image' && p.filename);

    const oldNews = typeof db.settings.news === 'object' ? db.settings.news : { text: db.settings.news || '' };
    const newText = textPart ? textPart.body.toString('utf8').trim() : oldNews.text;
    
    const newNewsObj = { text: newText, image: oldNews.image };

    if (imagePart) {
      const ext = path.extname(imagePart.filename).toLowerCase() || '.jpg';
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const filename = `news-${Date.now()}${ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), imagePart.body);
        newNewsObj.image = `imagines/uploads/${filename}`;
      }
    }

    db.settings.news = newNewsObj;
    writeDb(db);
    sendJson(res, 200, db.settings.news);
    return true;
  }

  // Читання товарів
  if (req.method === 'GET' && url.pathname === '/api/products') {
    const category = url.searchParams.get('category');
    const products = category
      ? db.products.filter((product) => product.category === category)
      : db.products;
    sendJson(res, 200, products);
    return true;
  }

  // Додавання або редагування товару

  if (req.method === 'DELETE' && url.pathname === '/api/products') {
    const id = url.searchParams.get('id');
    if (!id) {
      sendText(res, 400, 'Product id is required');
      return true;
    }

    const beforeCount = db.products.length;
    db.products = db.products.filter((product) => product.id !== id);
    if (db.products.length === beforeCount) {
      sendText(res, 404, 'Product not found');
      return true;
    }

    writeDb(db);
    sendJson(res, 200, { success: true });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/products') {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      sendText(res, 415, 'Очікується multipart/form-data');
      return true;
    }

    const parts = parseMultipart(await collectBody(req), contentType);
    const fields = Object.fromEntries(
      parts
        .filter((part) => !part.filename)
        .map((part) => [part.name, part.body.toString('utf8').trim()])
    );
    const image = parts.find((part) => part.name === 'image' && part.filename);
    const productId = fields.id;

    // Фото обов'язкове ТІЛЬКИ якщо ми створюємо НОВИЙ товар (немає productId)
    if (!fields.name || !fields.category || !fields.description || (!image && !productId)) {
      sendText(res, 400, 'Заповніть назву, категорію та опис. Фото обов’язкове лише для нових товарів.');
      return true;
    }

    let savedFilename = ''; // Змінили ім'я змінної, щоб 100% не було конфліктів
    if (image) {
      const ext = path.extname(image.filename).toLowerCase() || '.jpg';
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        sendText(res, 400, 'Підтримуються лише JPG, PNG або WEBP');
        return true;
      }
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      savedFilename = `${Date.now()}-${slugify(fields.name)}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, savedFilename), image.body);
    }

    if (productId) {
      // --- РЕДАГУВАННЯ ---
      const index = db.products.findIndex(p => p.id === productId);
      if (index !== -1) {
        db.products[index] = {
          ...db.products[index],
          name: fields.name,
          category: fields.category,
          description: fields.description,
          image: image ? `imagines/uploads/${savedFilename}` : db.products[index].image
        };
        writeDb(db);
        sendJson(res, 200, db.products[index]);
      } else {
        sendText(res, 404, 'Товар не знайдено');
      }
    } else {
      // --- СТВОРЕННЯ ---
      const product = {
        id: `${slugify(fields.category)}-${crypto.randomUUID()}`,
        name: fields.name,
        category: fields.category,
        description: fields.description,
        image: `imagines/uploads/${savedFilename}`,
        createdAt: new Date().toISOString()
      };
      db.products.unshift(product);
      writeDb(db);
      sendJson(res, 201, product);
    }
    return true;
  
  }

  return false;
}

function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);

  if (requested === '/admin') requested = '/admin.html';
  if (requested === '/login') requested = '/login.html';

  if (requested === '/admin.html' && !isAuthenticated(req)) {
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

  if (requested === '/login.html' && isAuthenticated(req)) {
    res.writeHead(302, { Location: '/admin' });
    res.end();
    return;
  }

  const filePath = path.normalize(path.join(ROOT, requested));

  if (!filePath.startsWith(ROOT)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, 'Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname.startsWith('/api/') && await handleApi(req, res, url)) return;
    serveStatic(req, res, url);
  } catch (error) {
    sendText(res, error.message === 'Payload too large' ? 413 : 500, error.message || 'Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Pokutska bakery site: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);

});

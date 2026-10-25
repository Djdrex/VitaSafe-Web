'use strict';

const http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const {
  openDatabase
} = require('./src/db/database');
const {
  createPasswordHash,
  verifyPassword
} = require('./src/security/password');
const {
  validateSchedule,
  availability
} = require('./src/scheduling');
async function createApp(options={}) {
const environment=options.environment||process.env;
const DEMO_MODE = environment.DEMO_MODE === 'true';
const PORT = Number(environment.PORT || 3000),
  ROOT = __dirname;
const db = options.database || (await openDatabase(environment, options));
const defaults = {
  brand: 'VitaSafe',
  tagline: 'Prepárate hoy, vive más tranquilo',
  admin_email: String(environment.VITASAFE_ADMIN_EMAIL || '').trim().toLowerCase(),
  private_mode: 'true',
  orders_enabled: 'false',
  care_enabled: 'false',
  payments_qr_enabled: 'false',
  payments_card_enabled: 'false',
  help_enabled: 'false',
  complaints_enabled: 'false',
  business_name: '',
  ruc: '',
  address: '',
  whatsapp: '',
  support_email: '',
  support_hours: 'Todos los días · 8:00 a. m. – 10:00 p. m.',
  pickup_address: 'Punto de recojo por confirmar — Av. La Molina',
  pickup_map_url: '',
  qr_image: '',
  care_price: '5900',
  delivery_notice: 'Costo y horario sujetos a confirmación',
  privacy_url: '',
  terms_url: ''
};
for (const [k, v] of Object.entries(defaults)) await db.prepare('INSERT OR IGNORE INTO settings(k,v) VALUES(?,?)').run(k, v);
const seeds = [['campus', 'VitaSafe Campus', 'campus', 'Kit compacto de primeros auxilios para actividades cotidianas.', 'Diario', 'Gasas estériles, apósitos, vendas, guantes, solución salina, gel para manos, tijeras y guía.'], ['ruta', 'VitaSafe Ruta', 'ruta', 'Preparación básica para desplazamientos y emergencias viales.', 'Movilidad', 'Gasas, apósitos, vendaje compresivo, guantes, manta térmica, linterna, silbato, chaleco y guía.'], ['sendero', 'VitaSafe Sendero', 'sendero', 'Kit compacto para caminatas y actividades al aire libre.', 'Aventura', 'Gasas, apósitos, vendas, manta térmica, silbato, linterna y guía.'], ['hogar', 'VitaSafe Hogar', 'hogar', 'Organización de suministros esenciales de primeros auxilios en casa.', 'Hogar', 'Gasas, apósitos, vendas, guantes, solución salina, tijeras, pinzas y guía.'], ['prevent', 'VitaSafe Prevent', 'prevent', 'Complemento de preparación ante imprevistos y emergencias.', 'Preparación', 'Poncho, linterna, silbato, manta térmica, suministros de curación y guía.'], ['mascota', 'VitaSafe Mascota', 'mascota', 'Suministros básicos para acompañar la atención veterinaria.', 'Mascotas', 'Gasas, apósitos, venda cohesiva veterinaria, guantes y guía.']];
for (const s of seeds) await db.prepare('INSERT OR IGNORE INTO products(id,name,slug,description,category,contents) VALUES(?,?,?,?,?,?)').run(...s);
const getSettings = async () => Object.fromEntries((await db.prepare('SELECT k,v FROM settings').all()).map(x => [x.k, x.v]));
const hash = x => crypto.createHash('sha256').update(x).digest('hex'),
  token = () => crypto.randomBytes(24).toString('base64url');
const safeEq = (a, b) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const loginAttempts = new Map();
function throttle(req) {
  const key = req.socket.remoteAddress || 'unknown',
    now = Date.now();
  let entry = loginAttempts.get(key);
  if (!entry || now - entry.start > 15 * 60_000) entry = {
    start: now,
    count: 0
  };
  entry.count++;
  loginAttempts.set(key, entry);
  if (entry.count > 12) fail(429, 'Demasiados intentos. Espera 15 minutos.');
  if (loginAttempts.size > 1000) for (const [k, v] of loginAttempts) if (now - v.start > 15 * 60_000) loginAttempts.delete(k);
}
function initialPassword() {
  return environment.VITASAFE_ADMIN_PASSWORD || '';
}
const json = (res, status, obj) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(obj));
};
const fail = (code, msg) => {
  const e = new Error(msg);
  e.status = code;
  throw e;
};
function body(req) {
  return new Promise((resolve, reject) => {
    let n = 0,
      b = '';
    req.on('data', c => {
      n += c.length;
      if (n > 2_000_000) {
        reject(Object.assign(new Error('Solicitud demasiado grande'), {
          status: 413
        }));
        req.destroy();
        return;
      }
      b += c;
    });
    req.on('end', () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        reject(Object.assign(new Error('JSON inválido'), {
          status: 400
        }));
      }
    });
    req.on('error', reject);
  });
}
function adminSessionHash(t) {
  return hash(t);
}
async function admin(req) {
  const user = await sessionUser(req);
  return user?.role === 'admin';
}
async function sessionUser(req) {
  const c = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('vs_session='));
  if (!c) return null;
  return (await db.prepare('SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(hash(c.split('=')[1]), Date.now())) || null;
}
async function customer(req) {
  return await sessionUser(req);
}
function customerCookie(res, t, maxAge = 604800) {
  res.setHeader('Set-Cookie', `vs_customer=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${environment.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
}
async function audit(kind, ref, detail = '') {
  await db.prepare('INSERT INTO audit_log(kind,ref,detail) VALUES(?,?,?)').run(kind, ref, detail);
}
function csvCell(x) {
  const v = String(x ?? '');
  const safe = /^[=+@\-\t\r]/.test(v) ? "'" + v : v;
  return '"' + safe.replace(/"/g, '""') + '"';
}
function csvDownload(res, name, rows) {
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${name}.csv"`,
    'Cache-Control': 'no-store'
  });
  res.end(csv);
}
function checkOrigin(req) {
  const o = req.headers.origin;
  if (o) {
    const h = req.headers.host;
    try {
      if (new URL(o).host !== h) fail(403, 'Origen no permitido');
    } catch (e) {
      if (e.status) throw e;
      fail(403, 'Origen no permitido');
    }
  }
}
const publicSettings = s => ({
  brand: s.brand,
  tagline: s.tagline,
  private_mode: s.private_mode,
  orders_enabled: s.orders_enabled,
  care_enabled: s.care_enabled,
  payments_qr_enabled: s.payments_qr_enabled,
  payments_card_enabled: s.payments_card_enabled,
  help_enabled: s.help_enabled,
  complaints_enabled: s.complaints_enabled,
  whatsapp: s.whatsapp,
  support_email: s.support_email,
  support_hours: s.support_hours,
  pickup_address: s.pickup_address,
  pickup_map_url: s.pickup_map_url,
  qr_image: s.payments_qr_enabled === 'true' ? s.qr_image : '',
  care_price: s.care_price,
  delivery_notice: s.delivery_notice,
  business_name: s.business_name,
  ruc: s.ruc,
  address: s.address,
  privacy_url: s.privacy_url,
  terms_url: s.terms_url
});
function validateString(v, max = 200) {
  if (typeof v !== 'string' || v.trim().length > max) fail(400, 'Texto inválido');
  return v.trim();
}
function validateImage(v) {
  const image = validateString(v, 300000);
  if (image && !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) fail(400, 'Carga una imagen PNG, JPG o WebP desde tu equipo');
  return image;
}
async function ensureReady(s) {
  const issues = [];
  if (!s.business_name || !/^(10|20)\d{9}$/.test(s.ruc)) issues.push('Datos comerciales y RUC');
  if (!s.support_email && !s.whatsapp) issues.push('Canal de atención');
  if (!s.privacy_url || !s.terms_url) issues.push('Políticas legales');
  if (s.complaints_enabled !== 'true') issues.push('Libro de Reclamaciones');
  if (!(await db.prepare('SELECT id FROM products WHERE active=1 AND price>0 AND stock>0 LIMIT 1').get())) issues.push('Producto disponible con precio real');
  return issues;
}
async function api(req, res, u) {
  const m = req.method,
    p = u.pathname,
    s = await getSettings(),
    isAdmin = await admin(req),
    priv = s.private_mode === 'true';
  if (m !== 'GET') checkOrigin(req);
  if (DEMO_MODE && m !== 'GET' && !['/api/auth/login', '/api/account/login', '/api/auth/logout', '/api/account/logout', '/api/admin/excel/preview', '/api/admin/excel/test-apply', '/api/admin/onedrive/connect', '/api/admin/onedrive/sync', '/api/admin/onedrive/disconnect'].includes(p)) fail(403, 'Vista de demostración: registros, compras y cambios están deshabilitados. No ingreses datos reales.');
  if (p === '/api/health') return json(res, 200, {
    ok: true,
    version: '0.6.0',
    mode: DEMO_MODE ? 'demo' : priv ? 'private' : 'public',
    database: db.kind,
    persistent: db.persistent
  });
  if (p === '/api/account/register' && m === 'POST') {
    throttle(req);
    const b = await body(req),
      email = validateString(String(b.email || '').toLowerCase(), 150),
      name = validateString(b.name || '', 100);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2) fail(400, 'Nombre o correo inválido');
    let encoded;
    try {
      encoded = createPasswordHash(String(b.password || ''));
    } catch (e) {
      fail(400, e.message);
    }
    const id = crypto.randomUUID();
    try {
      await db.prepare('INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)').run(id, email, name, encoded, 'customer');
    } catch (e) {
      if (/UNIQUE/.test(e.message)) fail(409, 'El correo ya está registrado');
      throw e;
    }
    const t = token();
    await db.prepare('INSERT INTO customer_sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(hash(t), id, Date.now() + 604800000);
    customerCookie(res, t);
    await audit('customer_registered', id);
    return json(res, 201, {
      ok: true,
      user: {
        id,
        email,
        name,
        role: 'customer'
      }
    });
  }
  if (['/api/account/login', '/api/auth/login'].includes(p) && m === 'POST') {
    throttle(req);
    const b = await body(req),
      email = String(b.email || '').trim().toLowerCase(),
      password = String(b.password || '');
    const user = await db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) fail(401, 'Correo o contraseña incorrectos');
    if (DEMO_MODE && user.role !== 'admin') fail(403, 'Cuentas de clientes deshabilitadas en demostración');
    const t = token();
    await db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(hash(t), user.id, Date.now() + 8 * 3600000);
    res.setHeader('Set-Cookie', `vs_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${environment.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
    loginAttempts.delete(req.socket.remoteAddress || 'unknown');
    return json(res, 200, {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  }
  if (p === '/api/account/me' && m === 'GET') return json(res, 200, {
    user: await sessionUser(req)
  });
  if (p === '/api/account/orders' && m === 'GET') fail(403, 'Historial disponible después de verificar el correo; usa el enlace privado del pedido');
  if (p === '/api/auth/status' && m === 'GET') return json(res, 200, {
    admin: isAdmin,
    user: await sessionUser(req)
  });
  if (p === '/api/auth/change-password' && m === 'POST') {
    if (!isAdmin) fail(401, 'Inicia sesión');
    const user = await sessionUser(req),
      b = await body(req),
      stored = await db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id);
    if (!verifyPassword(String(b.current_password || ''), stored.password_hash)) fail(401, 'Contraseña actual incorrecta');
    let encoded;
    try {
      encoded = createPasswordHash(String(b.new_password || ''));
    } catch (e) {
      fail(400, e.message);
    }
    await db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(encoded, user.id);
    await db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
    return json(res, 200, {
      ok: true,
      login_required: true
    });
  }
  if (['/api/auth/logout', '/api/account/logout'].includes(p) && m === 'POST') {
    const c = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('vs_session='));
    if (c) await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(adminSessionHash(c.split('=')[1]));
    res.setHeader('Set-Cookie', 'vs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return json(res, 200, {
      ok: true
    });
  }
  if (p === '/api/onedrive/callback') {
    if (await handleIntegrations(req, res, u, {
      db,
      user: await sessionUser(req),
      environment,
      demo: DEMO_MODE,
      body,
      json,
      fail
    })) return;
  }
  if (p === '/api/availability' && m === 'GET') return json(res, 200, availability());
  if (p === '/api/config' && m === 'GET') return json(res, 200, {
    settings: publicSettings(s),
    demo_mode: DEMO_MODE,
    admin: isAdmin,
    ready_issues: isAdmin ? await ensureReady(s) : undefined
  });
  if (p === '/api/products' && m === 'GET') {
    if (priv && !isAdmin && !DEMO_MODE) fail(403, 'Tienda privada');
    return json(res, 200, {
      products: await db.prepare(isAdmin ? 'SELECT * FROM products ORDER BY rowid' : 'SELECT * FROM products WHERE active=1 ORDER BY rowid').all()
    });
  }
  if (p === '/api/order' && m === 'POST') {
    if (priv && !isAdmin) fail(403, 'Tienda privada');
    if (s.orders_enabled !== 'true' && !isAdmin) fail(403, 'Pedidos deshabilitados');
    const b = await body(req),
      name = validateString(b.customer, 100),
      phone = validateString(b.phone, 30),
      email = validateString(b.email || '', 150),
      type = b.delivery_type;
    if (!name || !phone || !['delivery', 'pickup'].includes(type)) fail(400, 'Datos de pedido incompletos');
    const requested = validateString(b.requested_date, 10);
    const requestedTime = validateString(b.requested_time || '', 5);
    try {
      validateSchedule(requested, requestedTime);
    } catch (e) {
      fail(400, e.message);
    }
    const address = validateString(b.address || '', 200),
      district = validateString(b.district || '', 100);
    if (type === 'delivery' && (!address || !district)) fail(400, 'Completa dirección y distrito');
    const items = b.items;
    if (!Array.isArray(items) || !items.length || items.length > 30) fail(400, 'Carrito inválido');
    const idem = validateString(b.idempotency_key || '', 120);
    if (!idem || idem.length < 12) fail(400, 'Falta identificador de compra');
    const existing = await db.prepare('SELECT order_id FROM idempotency WHERE k=?').get(idem);
    if (existing) {
      const old = await db.prepare('SELECT id,subtotal,total,status FROM orders WHERE id=?').get(existing.order_id);
      return json(res, 200, {
        order: old,
        reused: true,
        notice: 'Pedido existente: utiliza el enlace privado entregado originalmente'
      });
    }
    const resolved = [];
    let subtotal = 0;
    for (const item of items) {
      const id = validateString(item.id, 40),
        qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 30) fail(400, 'Cantidad inválida');
      const prod = await db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(id);
      if (!prod || prod.price <= 0) fail(400, 'Producto no disponible');
      if (prod.stock < qty) fail(409, `Stock insuficiente: ${prod.name}`);
      resolved.push({
        id,
        name: prod.name,
        qty,
        price: prod.price
      });
      subtotal += qty * prod.price;
    }
    if (subtotal > 10_000_000) fail(400, 'Importe excedido');
    const id = 'VS-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      secret = token();
    await db.exec('BEGIN IMMEDIATE');
    try {
      const already = await db.prepare('SELECT order_id FROM idempotency WHERE k=?').get(idem);
      if (already) fail(409, 'Solicitud ya procesada');
      for (const x of resolved) {
        const change = await db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').run(x.qty, x.id, x.qty);
        if (change.changes !== 1) fail(409, 'El inventario cambió. Actualiza el carrito');
        await db.prepare('INSERT INTO inventory_events(product_id,delta,reason,ref) VALUES(?,?,?,?)').run(x.id, -x.qty, 'order_reserved', id);
      }
      await db.prepare(`INSERT INTO orders(id,secret_hash,customer,email,phone,address,district,reference,delivery_type,requested_date,payment_method,items,subtotal,total,source,notes,requested_time) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, hash(secret), name, email, phone, address, district, validateString(b.reference || '', 200), type, requested, validateString(b.payment_method || 'manual', 30), JSON.stringify(resolved), subtotal, subtotal, validateString(b.source || 'web', 30), validateString(b.notes || '', 500), requestedTime);
      await db.prepare('INSERT INTO idempotency(k,order_id) VALUES(?,?)').run(idem, id);
      await db.prepare('INSERT INTO order_events(order_id,kind,detail) VALUES(?,?,?)').run(id, 'created', 'Solicitud registrada');
      await audit('order_created', id);
      await db.exec('COMMIT');
    } catch (e) {
      await db.exec('ROLLBACK');
      throw e;
    }
    return json(res, 201, {
      order: {
        id,
        secret,
        subtotal,
        total: subtotal,
        status: 'received'
      },
      notice: 'Guarda el enlace privado. El delivery se cotiza y confirma por separado.'
    });
  }
  if (p.startsWith('/api/track/') && m === 'GET') {
    const id = decodeURIComponent(p.slice('/api/track/'.length)),
      secret = u.searchParams.get('key') || '',
      o = await db.prepare('SELECT * FROM orders WHERE id=?').get(id);
    if (!o || !safeEq(o.secret_hash, hash(secret))) fail(404, 'Pedido no encontrado');
    delete o.secret_hash;
    return json(res, 200, {
      order: o,
      events: await db.prepare('SELECT kind,detail,created_at FROM order_events WHERE order_id=? ORDER BY id').all(id)
    });
  }
  if (p === '/api/ticket' && m === 'POST') {
    if (priv && !isAdmin) fail(403, 'Tienda privada');
    const b = await body(req),
      kind = validateString(b.kind, 20);
    if (!['help', 'claim', 'complaint'].includes(kind)) fail(400, 'Tipo inválido');
    if (kind === 'help' && s.help_enabled !== 'true' && !isAdmin) fail(403, 'Ayuda no disponible');
    if (kind !== 'help' && s.complaints_enabled !== 'true' && !isAdmin) fail(403, 'Libro no disponible');
    const id = (kind === 'help' ? 'AYU' : 'REC') + '-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex'),
      secret = token();
    const name = validateString(b.name, 100),
      email = validateString(b.email, 150),
      message = validateString(b.message, 4000);
    if (!name || !email.includes('@') || !message) fail(400, 'Completa los campos obligatorios');
    await db.prepare('INSERT INTO tickets(id,secret_hash,kind,name,email,phone,message,product,request) VALUES(?,?,?,?,?,?,?,?,?)').run(id, hash(secret), kind, name, email, validateString(b.phone || '', 30), message, validateString(b.product || '', 150), validateString(b.request || '', 1500));
    return json(res, 201, {
      id,
      secret,
      notice: 'Guarda tu constancia y código de seguimiento'
    });
  }
  if (p.startsWith('/api/ticket/') && m === 'GET') {
    const id = decodeURIComponent(p.slice('/api/ticket/'.length)),
      t = await db.prepare('SELECT * FROM tickets WHERE id=?').get(id);
    if (!t || !safeEq(t.secret_hash, hash(u.searchParams.get('key') || ''))) fail(404, 'Consulta no encontrada');
    delete t.secret_hash;
    return json(res, 200, {
      ticket: t
    });
  }
  if (p.startsWith('/api/admin/')) {
    if (!isAdmin) fail(401, 'Acceso de administrador requerido');
    const b = m === 'GET' || p.startsWith('/api/admin/excel/') || p.startsWith('/api/admin/onedrive/') ? {} : await body(req);
    if (await handleIntegrations(req, res, u, {
      db,
      user: await sessionUser(req),
      environment,
      demo: DEMO_MODE,
      body,
      json,
      fail
    })) return;
    if (p === '/api/admin/export' && m === 'GET') {
      const kind = u.searchParams.get('type') || 'orders';
      const queries = {
        orders: ['id', 'customer', 'email', 'phone', 'status', 'payment_status', 'total', 'created_at'],
        products: ['id', 'name', 'category', 'price', 'stock', 'active'],
        memberships: ['id', 'email', 'name', 'status', 'starts_at', 'ends_at'],
        inventory: ['id', 'product_id', 'delta', 'reason', 'ref', 'created_at'],
        audit: ['id', 'kind', 'ref', 'detail', 'created_at']
      };
      const tables = {
        orders: 'orders',
        products: 'products',
        memberships: 'memberships',
        inventory: 'inventory_events',
        audit: 'audit_log'
      };
      if (!queries[kind]) fail(400, 'Reporte desconocido');
      const cols = queries[kind],
        rows = await db.prepare(`SELECT ${cols.join(',')} FROM ${tables[kind]} ORDER BY rowid DESC LIMIT 10000`).all();
      return csvDownload(res, 'vitasafe-' + kind, [cols, ...rows.map(row => cols.map(c => row[c]))]);
    }
    if (p === '/api/admin/settings' && m === 'GET') return json(res, 200, {
      settings: Object.fromEntries(Object.entries(s).filter(([k]) => !/(password|secret|token)/i.test(k))),
      demo_mode: DEMO_MODE,
      ready_issues: await ensureReady(s)
    });
    if (p === '/api/admin/settings' && m === 'PATCH') {
      const allowed = new Set(Object.keys(defaults).filter(x => x !== 'admin_email'));
      for (const [k, v] of Object.entries(b)) {
        if (!allowed.has(k) || typeof v !== 'string' || v.length > 300000) fail(400, 'Configuración inválida');
        if (k === 'private_mode' && v === 'false') {
          const merged = {
            ...s,
            ...b
          };
          const issues = await ensureReady(merged);
          if (issues.length) fail(409, 'Faltan requisitos para publicar: ' + issues.join(', '));
        }
        if (k === 'payments_card_enabled' && v === 'true') fail(409, 'Pasarela no integrada: no se puede activar');
        if (k === 'complaints_enabled' && v === 'true' && (!b.ruc && !s.ruc || !b.business_name && !s.business_name)) fail(409, 'Completa los datos del proveedor primero');
        await db.prepare('UPDATE settings SET v=? WHERE k=?').run(v, k);
      }
      return json(res, 200, {
        ok: true,
        settings: await getSettings()
      });
    }
    if (p === '/api/admin/products' && m === 'POST') {
      const id = validateString(b.id || crypto.randomBytes(6).toString('hex'), 40);
      const name = validateString(b.name, 100),
        slug = validateString(b.slug || id, 100),
        desc = validateString(b.description || '', 2000),
        category = validateString(b.category || '', 80),
        price = Number(b.price),
        stock = Number(b.stock);
      if (!name || !slug || !Number.isInteger(price) || price < 0 || !Number.isInteger(stock) || stock < 0) fail(400, 'Producto inválido');
      await db.prepare('INSERT INTO products(id,name,slug,description,category,price,stock,image,contents,active) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, name, slug, desc, category, price, stock, validateImage(b.image || ''), validateString(b.contents || '', 4000), b.active === false ? 0 : 1);
      await audit('product_created', id);
      return json(res, 201, {
        id
      });
    }
    if (p.startsWith('/api/admin/products/') && m === 'PATCH') {
      const id = decodeURIComponent(p.split('/').pop()),
        allowed = ['name', 'slug', 'description', 'category', 'price', 'stock', 'image', 'contents', 'active'];
      if (!(await db.prepare('SELECT id FROM products WHERE id=?').get(id))) fail(404, 'Producto inexistente');
      for (const [k, v] of Object.entries(b)) {
        if (!allowed.includes(k)) fail(400, 'Campo inválido');
        if (['price', 'stock', 'active'].includes(k)) {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0 || n > 100000000) fail(400, 'Número inválido');
          await db.prepare(`UPDATE products SET ${k}=? WHERE id=?`).run(n, id);
        } else await db.prepare(`UPDATE products SET ${k}=? WHERE id=?`).run(k === 'image' ? validateImage(v) : validateString(v, 4000), id);
      }
      await audit('product_updated', id, JSON.stringify(Object.keys(b)));
      return json(res, 200, {
        ok: true
      });
    }
    if (p === '/api/admin/orders' && m === 'GET') return json(res, 200, {
      orders: (await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all()).map(({
        secret_hash,
        ...o
      }) => o)
    });
    if (p.startsWith('/api/admin/orders/') && m === 'PATCH') {
      const id=decodeURIComponent(p.split('/').pop());
      await db.transaction(async()=>{
        const old=await db.prepare('SELECT * FROM orders WHERE id=? FOR UPDATE').get(id);
        if(!old)fail(404,'Pedido inexistente');
        if(old.source==='excel-history')fail(409,'El historial importado es de solo lectura');
        if(old.status==='cancelled'&&b.status&&b.status!=='cancelled')fail(409,'No reactivar pedido cancelado: crea otro');
        const allowed=['status','payment_status','confirmed_date','eta','delivery_fee','notes'];
        for(const [k,v] of Object.entries(b)){
          if(!allowed.includes(k))fail(400,'Campo inválido');
          if(k==='status'&&!['received','confirmed','preparing','ready','on_route','delivered','cancelled'].includes(v))fail(400,'Estado inválido');
          if(k==='payment_status'&&!['pending','verified','failed','refunded'].includes(v))fail(400,'Pago inválido');
          if(k==='delivery_fee'){if(!Number.isSafeInteger(Number(v))||Number(v)<0||Number(v)>100000)fail(400,'Costo inválido');await db.prepare('UPDATE orders SET delivery_fee=?,total=subtotal+? WHERE id=?').run(Number(v),Number(v),id)}
          else await db.prepare(`UPDATE orders SET ${k}=? WHERE id=?`).run(validateString(v,500),id);
        }
        if(b.status==='cancelled'&&old.status!=='cancelled')for(const item of JSON.parse(old.items)){
          await db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(item.qty,item.id);
          await db.prepare('INSERT INTO inventory_events(product_id,delta,reason,ref) VALUES(?,?,?,?)').run(item.id,item.qty,'order_cancelled',id);
        }
        await db.prepare('INSERT INTO order_events(order_id,kind,detail) VALUES(?,?,?)').run(id,'updated',JSON.stringify(b));
        await audit('order_updated',id,JSON.stringify(b));
      });
      return json(res,200,{ok:true});
    }
    if (p === '/api/admin/tickets' && m === 'GET') return json(res, 200, {
      tickets: await db.prepare('SELECT id,kind,name,email,phone,message,product,request,status,reply,created_at,answered_at FROM tickets ORDER BY created_at DESC LIMIT 300').all()
    });
    if (p.startsWith('/api/admin/tickets/') && m === 'PATCH') {
      const id = decodeURIComponent(p.split('/').pop());
      if (!(await db.prepare('SELECT id FROM tickets WHERE id=?').get(id))) fail(404, 'Ticket inexistente');
      if (b.status && !['new', 'in_progress', 'waiting', 'resolved'].includes(b.status)) fail(400, 'Estado inválido');
      await db.prepare('UPDATE tickets SET status=COALESCE(?,status),reply=COALESCE(?,reply),answered_at=CASE WHEN CAST(? AS TEXT) IS NOT NULL THEN CURRENT_TIMESTAMP ELSE answered_at END WHERE id=?').run(b.status || null, b.reply === undefined ? null : validateString(b.reply, 4000), b.reply === undefined ? null : b.reply, id);
      return json(res, 200, {
        ok: true
      });
    }
    if (p === '/api/admin/memberships' && m === 'GET') return json(res, 200, {
      memberships: await db.prepare('SELECT * FROM memberships ORDER BY created_at DESC').all()
    });
    if (p === '/api/admin/memberships' && m === 'POST') {
      const id = 'CARE-' + crypto.randomBytes(5).toString('hex'),
        email = validateString(b.email, 150),
        name = validateString(b.name, 100);
      if (!email.includes('@') || !name) fail(400, 'Datos inválidos');
      await db.prepare('INSERT INTO memberships(id,email,name,status) VALUES(?,?,?,?)').run(id, email, name, 'pending');
      await audit('membership_created', id);
      return json(res, 201, {
        id
      });
    }
    if (p.startsWith('/api/admin/memberships/') && m === 'PATCH') {
      const id = decodeURIComponent(p.split('/').pop());
      if (!(await db.prepare('SELECT id FROM memberships WHERE id=?').get(id))) fail(404, 'No existe');
      if (!['pending', 'active', 'expired', 'cancelled'].includes(b.status)) fail(400, 'Estado inválido');
      await db.prepare('UPDATE memberships SET status=?,starts_at=?,ends_at=? WHERE id=?').run(b.status, validateString(b.starts_at || '', 10), validateString(b.ends_at || '', 10), id);
      await audit('membership_updated', id, b.status);
      return json(res, 200, {
        ok: true
      });
    }
    if (p === '/api/admin/kit-items' && m === 'GET') return json(res, 200, {
      items: await db.prepare('SELECT * FROM kit_items ORDER BY expires_on').all()
    });
    if (p === '/api/admin/kit-items' && m === 'POST') {
      const id = crypto.randomBytes(8).toString('hex'),
        email = validateString(b.owner_email, 150),
        item = validateString(b.item_name, 150);
      if (!email.includes('@') || !item) fail(400, 'Datos inválidos');
      await db.prepare('INSERT INTO kit_items(id,owner_email,product_id,item_name,lot,expires_on,quantity) VALUES(?,?,?,?,?,?,?)').run(id, email, validateString(b.product_id || '', 40), item, validateString(b.lot || '', 80), validateString(b.expires_on || '', 10), Math.max(1, Number(b.quantity) || 1));
      return json(res, 201, {
        id
      });
    }
    if (p === '/api/admin/stats' && m === 'GET') return json(res, 200, {
      products: (await db.prepare('SELECT COUNT(*) n FROM products').get()).n,
      orders: (await db.prepare('SELECT COUNT(*) n FROM orders').get()).n,
      tickets: (await db.prepare('SELECT COUNT(*) n FROM tickets').get()).n,
      pending: (await db.prepare("SELECT COUNT(*) n FROM orders WHERE status NOT IN ('delivered','cancelled')").get()).n,
      revenue: (await db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE payment_status='verified' AND status!='cancelled'").get()).n,
      low_stock: await db.prepare('SELECT id,name,stock FROM products WHERE stock<=3 AND active=1').all()
    });
    fail(404, 'Ruta de administración no encontrada');
  }
  fail(404, 'Ruta no encontrada');
}
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
const ownerEmail = String(environment.VITASAFE_ADMIN_EMAIL || (await getSettings()).admin_email || '').trim().toLowerCase();
if (ownerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) && initialPassword().length >= 12 && initialPassword().length <= 256) {
  await db.transaction(async () => {
    const owner = await db.prepare('SELECT id,role FROM users WHERE email=?').get(ownerEmail);
    const other = await db.prepare("SELECT id,email FROM users WHERE role='admin'").get();
    if (other && other.email !== ownerEmail) throw Error('An administrator already exists; refusing implicit ownership changes');
    if (!owner) await db.prepare('INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)').run(crypto.randomUUID(), ownerEmail, 'Administrador', createPasswordHash(initialPassword()), 'admin');else if (owner.role !== 'admin') throw Error('Existing customer cannot be silently promoted');
  });
}
const {
  handleIntegrations,
  startSyncWorker
} = require('./src/integrations');
const handler = async (req, res) => {
    try {
      const u = new URL(req.url, 'http://localhost');
      if (u.pathname.startsWith('/api/')) return await api(req, res, u);
      if (req.method !== 'GET') fail(405, 'Método no permitido');
      let name = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
      if (name.includes('..') || name.includes('\\') || name.startsWith('.')) fail(404, 'No encontrado');
      const file = path.join(ROOT, 'public', name);
      if (!file.startsWith(path.join(ROOT, 'public') + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) fail(404, 'No encontrado');
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
        'X-Frame-Options': 'DENY'
      });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      if (!res.headersSent) json(res, e.status || 500, {
        error: e.status ? e.message : 'Error interno del servidor'
      });else res.end();
      if (!e.status) console.error('request_failed', {code:e.code||'internal'});
    }
  },
  server = http.createServer((req, res) => {
    db.withConnection(() => handler(req, res)).catch(() => {
      if (!res.headersSent) {
        res.writeHead(500, {
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
          error: "Error interno del servidor"
        }));
      } else res.end();
    });
  });
if(options.startWorkers){const stop=startSyncWorker(db,environment);server.on('close',stop)}
return {server,db,ensureReady};
}
if(require.main===module){createApp({startWorkers:true}).then(({server})=>server.listen(Number(process.env.PORT||3000),process.env.HOST||"0.0.0.0",()=>console.log("VitaSafe v0.6 started"))).catch(()=>{console.error("VitaSafe startup failed; check database and owner configuration securely");process.exitCode=1})}
module.exports={createApp};

import { createHmac, randomBytes } from 'node:crypto';
import rows from './derechohabientes.json';
import { missions, normalize, type RequestEntry } from './shared';

const secret = process.env.SECRETO || 'clinica-digital-2026';
const sign = (s: string, length: number) => createHmac('sha256', secret).update(s).digest('hex').slice(0, length).toUpperCase();
const code = (p: string, n: number) => `M${n}-${sign(`${normalize(p)}|${n}`, 5)}`;
const state = globalThis as typeof globalThis & { clinicRequests?: RequestEntry[] };
const entries = state.clinicRequests ??= [];
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => new Response(status === 204 || status === 205 || status === 304 ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const invalid = (campos: string[]) => json({ error: 'Faltan datos o tienen un formato incorrecto', campos }, 422);
const missing = (id: string) => json({ error: 'No existe esa cita', id }, 404);
const validId = (id: string) => /^C[0-9A-F]{10}$/.test(id) && id.slice(7) === sign(id.slice(1, 7), 4);
const xmlEscape = (s: string) => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));

async function dispatch(req: Request): Promise<Response> {
  const url = new URL(req.url), path = url.pathname, method = req.method, p = req.headers.get('x-participante') || '';
  const mission = (data: object, status: number, n: number) => json({ ...data, mision: { numero: n, titulo: missions[n - 1].titulo, ...(p.trim() ? { participante: p.trim(), codigo: code(p, n), instruccion: 'Pega este código en el portal para guardar tu avance.' } : { aviso: 'Agrega el encabezado X-Participante con tu nombre para recibir tu código.' }) } }, status, { 'X-Mision': String(n), ...(p.trim() ? { 'X-Mision-Codigo': code(p, n) } : {}) });
  if (path === '/api/peticiones' && method === 'GET') {
    const participant = url.searchParams.get('participante');
    return json(entries.filter(e => participant === null || normalize(e.participante) === normalize(participant)).slice(-200).reverse());
  }
  if (path === '/api/salud' && method === 'GET') return json({ estado: 'en línea', sistema: 'Clínica Digital', derechohabientes: rows.length });
  if (path === '/api/misiones' && method === 'GET') return json(missions);
  if (path === '/api/derechohabientes' && method === 'GET') {
    const n = Number(url.searchParams.get('limite') ?? 5);
    return Number.isInteger(n) && n >= 1 && n <= 50 ? json({ total: rows.length, derechohabientes: rows.slice(0, n) }) : invalid(['limite']);
  }
  if (/^\/api\/derechohabientes\/[^/]+$/.test(path) && method === 'GET') {
    const curp = decodeURIComponent(path.split('/').pop()!).toUpperCase(), row = rows.find(r => r.curp === curp);
    return row ? mission(row, 200, 1) : mission({ error: 'No existe un derechohabiente con esa CURP', curp }, 404, 2);
  }
  if (path === '/api/protegido' && method === 'GET') return req.headers.get('authorization')?.trim() === 'Bearer clinica123' ? mission({ mensaje: 'Bienvenido a la zona de expedientes', acceso: 'concedido' }, 200, 5) : json({ error: 'Necesitas el encabezado Authorization: Bearer <token>' }, 401);
  if (path.startsWith('/api/simular/') && method === 'GET') {
    const value = path.split('/').pop();
    const n = Number(value === 'lento' ? url.searchParams.get('ms') ?? 3000 : value);
    if (!Number.isInteger(n) || n < (value === 'lento' ? 0 : 200) || n > (value === 'lento' ? 8000 : 599)) return invalid([value === 'lento' ? 'ms' : 'codigo']);
    if (value === 'lento') { await new Promise(r => setTimeout(r, n)); return json({ simulado: true, tardo_ms: n }); }
    return json({ simulado: true, codigo: n }, n);
  }
  if (path === '/soap' && method === 'POST') {
    const body = await req.text();
    const tag = (s: string) => body.match(new RegExp(`<(?:\\w+:)?${s}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${s}>`))?.[1]?.trim();
    const curp = (tag('curp') || '').toUpperCase(), row = rows.find(r => r.curp === curp);
    const fault = !body.includes('Envelope') || !body.includes('Body') ? 'Falta el sobre SOAP (Envelope y Body)' : !tag('ConsultarDerechohabiente') ? 'Operación desconocida. Usa ConsultarDerechohabiente' : !row ? `No existe un derechohabiente con la CURP ${curp}` : '';
    const inner = fault ? `<soap:Fault><faultcode>soap:Client</faultcode><faultstring>${xmlEscape(fault)}</faultstring></soap:Fault>` : `<cd:ConsultarDerechohabienteResponse><cd:curp>${row!.curp}</cd:curp><cd:nombre>${row!.nombre}</cd:nombre><cd:clinica>${row!.clinica}</cd:clinica><cd:vigente>true</cd:vigente></cd:ConsultarDerechohabienteResponse>`;
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cd="http://clinicadigital.local/citas"><soap:Body>${inner}</soap:Body></soap:Envelope>`, { status: fault ? 500 : 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
  }
  if (path === '/datos/curps_500.csv' && method === 'GET') return new Response(['curp,nombre,especialidad,clinica', ...rows.map(r => `${r.curp},${r.nombre},${r.especialidad},${r.clinica}`)].join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="curps_500.csv"' } });
  if ((path === '/api/citas' && method === 'POST') || (/^\/api\/citas\/[^/]+$/.test(path) && ['GET','PUT','PATCH','DELETE'].includes(method)) || (['/api/misiones/verificar','/api/misiones/constancia'].includes(path) && method === 'POST')) {
    let data: Record<string, unknown> = {};
    if (['POST','PUT','PATCH'].includes(method)) {
      const contentType = req.headers.get('content-type') || '';
      if (!contentType.includes('application/json') && !contentType.includes('+json')) return invalid(['body']);
      try { const parsed: unknown = await req.json(); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return invalid(['body']); data = parsed as Record<string, unknown>; }
      catch { return path === '/api/citas' ? mission({ error: 'El JSON está mal escrito', detalle: 'Revisa comas, comillas y llaves.' }, 400, 4) : json({ error: 'El JSON está mal escrito', detalle: 'Revisa comas, comillas y llaves.' }, 400); }
    }
    if (path.startsWith('/api/misiones/')) {
      if (typeof data.participante !== 'string' || !data.participante.trim()) return invalid(['participante']);
      const name = data.participante;
      if (path.endsWith('/verificar')) {
        if (typeof data.codigo !== 'string') return invalid(['codigo']);
        const c = data.codigo.trim().toUpperCase(), n = Number(c.match(/^M([1-5])-[0-9A-F]{5}$/)?.[1]);
        return n && c === code(name, n) ? json({ valido: true, numero: n, titulo: missions[n-1].titulo }) : json({ valido: false, mensaje: 'Ese código no corresponde a tu nombre. Revisa X-Participante.' }, 400);
      }
      if (!Array.isArray(data.codigos) || !data.codigos.every(c => typeof c === 'string')) return invalid(['codigos']);
      const codes = data.codigos.map(c => (c as string).trim().toUpperCase()), faltan = missions.filter(m => !codes.includes(code(name, m.numero))).map(m => m.numero);
      return faltan.length ? json({ completo: false, faltan }, 400) : json({ completo: true, folio: `CD-${sign(`constancia|${normalize(name)}`, 8)}` });
    }
    const fields = method === 'PATCH' ? ['especialidad','fecha','hora'] : ['curp','especialidad','fecha','hora'];
    if (['POST','PUT','PATCH'].includes(method)) {
      const bad = fields.filter(k => method === 'PATCH' ? data[k] != null && typeof data[k] !== 'string' : typeof data[k] !== 'string');
      if (bad.length) return invalid(bad);
    }
    if (path === '/api/citas') {
      const curp = (data.curp as string).toUpperCase();
      if (!rows.some(r => r.curp === curp)) return json({ error: 'La CURP no está registrada', curp }, 404);
      const base = randomBytes(3).toString('hex').toUpperCase();
      return mission({ id: `C${base}${sign(base,4)}`, curp, especialidad: data.especialidad, fecha: data.fecha, hora: data.hora, estado: 'agendada' }, 201, 3);
    }
    const id = path.split('/').pop()!;
    if (!validId(id)) return missing(id);
    if (method === 'DELETE') return new Response(null, { status: 204 });
    if (method === 'GET') return json({ id, estado: 'agendada', nota: 'Este id es válido: la cita existe.' });
    const picked = Object.fromEntries(fields.filter(k => data[k] != null).map(k => [k, data[k]]));
    if (method === 'PATCH' && !Object.keys(picked).length) return json({ error: 'Manda al menos un dato a cambiar, por ejemplo la hora' }, 400);
    return json({ id, ...picked, estado: method === 'PUT' ? 'reprogramada' : 'modificada' });
  }
  return json({ error: 'Ruta o método no disponible' }, 404);
}

export async function handle(req: Request) {
  const start = performance.now();
  const response = await dispatch(req);
  if (new URL(req.url).pathname !== '/api/peticiones') {
    const text = await response.clone().text();
    entries.push({ id: randomBytes(8).toString('hex'), fecha: new Date().toISOString(), metodo: req.method, ruta: new URL(req.url).pathname + new URL(req.url).search, estado: response.status, duracion: Math.round(performance.now() - start), participante: req.headers.get('x-participante') || '', codigo: response.headers.get('x-mision-codigo') || undefined, mision: Number(response.headers.get('x-mision')) || undefined, respuesta: text.slice(0, 6000) });
    if (entries.length > 500) entries.splice(0, entries.length - 500);
  }
  return response;
}

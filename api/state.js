import { createClient } from '@supabase/supabase-js';

const TABLE_NAME = 'finance_user_state';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY).'
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function parseBody(req) {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function isValidPayload(payload) {
  return !!payload && typeof payload === 'object' && !Array.isArray(payload);
}

export default async function handler(req, res) {
  // CORS (útil para pruebas manuales)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabase();

    // Health check opcional: /api/state?health=1
    if (req.method === 'GET' && req.query?.health === '1') {
      return res.status(200).json({
        ok: true,
        service: 'state-api',
        env: {
          hasSupabaseUrl: !!SUPABASE_URL,
          hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
        },
      });
    }

    // GET: leer estado por userId
    if (req.method === 'GET') {
      const userId = cleanString(req.query?.userId);
      if (!userId) {
        return res.status(400).json({ ok: false, error: 'Falta userId' });
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('user_id, payload, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({
        ok: true,
        found: !!data,
        payload: data?.payload ?? null,
        updated_at: data?.updated_at ?? null,
      });
    }

    // POST: guardar/actualizar estado por userId
    if (req.method === 'POST') {
      const body = parseBody(req);

      const userId = cleanString(body?.userId);
      const payload = body?.payload;

      if (!userId) {
        return res.status(400).json({ ok: false, error: 'Falta userId' });
      }

      if (!isValidPayload(payload)) {
        return res.status(400).json({ ok: false, error: 'payload inválido' });
      }

      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(
          {
            user_id: userId,
            payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return res.status(500).json({ ok: false, error: message });
  }
}

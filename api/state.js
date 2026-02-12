import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  // Permitir CORS básico (opcional, útil para pruebas)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const userId = String(req.query.userId || '').trim();
      if (!userId) {
        return res.status(400).json({ ok: false, error: 'Falta userId' });
      }

      const { data, error } = await supabase
        .from('finance_user_state')
        .select('payload, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({
        ok: true,
        found: !!data,
        payload: data?.payload ?? null,
        updated_at: data?.updated_at ?? null
      });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const userId = String(body.userId || '').trim();
      const payload = body.payload;

      if (!userId) {
        return res.status(400).json({ ok: false, error: 'Falta userId' });
      }

      if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ ok: false, error: 'payload inválido' });
      }

      const { error } = await supabase
        .from('finance_user_state')
        .upsert(
          {
            user_id: userId,
            payload,
            updated_at: new Date().toISOString()
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

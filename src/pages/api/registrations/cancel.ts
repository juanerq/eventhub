import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { registration_id, event_id } = body || {};

    if (!registration_id && !event_id) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Intentar actualizar por registration_id si se proporciona, sino por event_id + user
    let updateQuery = supabase.from('event_registrations').update({ status: 'cancelled' }).select();

    if (registration_id) {
      updateQuery = updateQuery.eq('id', registration_id);
    } else {
      updateQuery = updateQuery.eq('event_id', event_id).eq('user_id', user.id);
    }

    const { data: updated, error: updateError } = await updateQuery.single();

    if (updateError) {
      console.error('Error cancelling registration:', updateError);
      // Puede ser 404 (no encontrado) o 403 si RLS lo impide
      return new Response(JSON.stringify({ error: 'No se pudo cancelar la inscripción' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Inscripción no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, registration: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Server error cancelling registration:', err);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

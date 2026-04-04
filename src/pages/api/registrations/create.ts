import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener sesión del usuario
    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del formulario
    const body = await request.json();
    const { event_id, full_name, email, phone, additional_info } = body;

    // Validar datos requeridos
    if (!event_id || !full_name || !email) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el evento existe y está publicado
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, capacity, status')
      .eq('id', event_id)
      .eq('status', 'published')
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado o no disponible' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si ya está inscrito
    const { data: existingReg } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .single();

    if (existingReg) {
      return new Response(
        JSON.stringify({ error: 'Ya estás inscrito en este evento' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar capacidad si existe
    if (event.capacity) {
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('status', 'confirmed');

      if (count && count >= event.capacity) {
        return new Response(
          JSON.stringify({ error: 'El evento está lleno' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Crear inscripción
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id,
        user_id: user.id,
        full_name,
        email,
        phone,
        additional_info,
        status: 'confirmed',
      })
      .select()
      .single();

    if (regError) {
      console.error('Error creating registration:', regError);
      return new Response(
        JSON.stringify({ error: 'Error al crear la inscripción' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket_number: registration.ticket_number,
        registration_id: registration.id,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Error del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

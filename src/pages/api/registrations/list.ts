import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión inválida' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener inscripciones confirmadas del usuario
    const { data: regs, error: regsError } = await supabaseAdmin
      .from('event_registrations')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('status', 'confirmed');

    if (regsError) {
      console.error('Error fetching registrations:', regsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al obtener inscripciones' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const eventIds = (regs || []).map((r: any) => r.event_id).filter(Boolean);

    if (!eventIds.length) {
      return new Response(
        JSON.stringify({ success: true, events: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener eventos relacionados
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .in('id', eventIds)
      .order('start_date', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al obtener eventos' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener imágenes principales
    const { data: images } = await supabaseAdmin
      .from('event_images')
      .select('event_id, image_url, is_primary')
      .in('event_id', eventIds);

    const imageMap: Record<string, string> = {};
    images?.forEach((img: any) => {
      if (img.is_primary) imageMap[img.event_id] = img.image_url;
      else if (!imageMap[img.event_id]) imageMap[img.event_id] = img.image_url;
    });

    const eventsWithImages = (events || []).map((ev: any) => ({
      ...ev,
      image_url: imageMap[ev.id] || null,
    }));

    return new Response(
      JSON.stringify({ success: true, events: eventsWithImages }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

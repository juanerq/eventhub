import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    const city = url.searchParams.get('city');
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return new Response(
        JSON.stringify({ error: 'Error al obtener eventos' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For each event, fetch its primary image from event_images
    const eventsWithImages = await Promise.all(
      (events || []).map(async (event) => {
        const { data: image } = await supabase
          .from('event_images')
          .select('image_url')
          .eq('event_id', event.id)
          .eq('is_primary', true)
          .single();
        
        return {
          ...event,
          image_url: image?.image_url || null
        };
      })
    );

    return new Response(
      JSON.stringify({ events: eventsWithImages }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Error del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

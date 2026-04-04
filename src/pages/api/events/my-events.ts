import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Get access token from cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autenticado' }),
        { status: 401 }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión inválida' }),
        { status: 401 }
      );
    }

    // Get user's events
    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al obtener eventos' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, events }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error del servidor' }),
      { status: 500 }
    );
  }
};

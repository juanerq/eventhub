import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID de evento requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get access token from cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión inválida' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the event belongs to the user
    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('organizer_id')
      .eq('id', id)
      .single();

    if (fetchError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: 'Evento no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (event.organizer_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No tienes permiso para eliminar este evento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete the event
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al eliminar el evento' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Evento eliminado correctamente' }),
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

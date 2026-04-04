import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async () => {
  try {
    // Obtener todos los planes disponibles
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al obtener planes' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        plans: plans || []
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error del servidor' }),
      { status: 500 }
    );
  }
};

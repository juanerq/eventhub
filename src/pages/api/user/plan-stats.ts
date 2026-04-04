import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autenticado' }),
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión inválida' }),
        { status: 401 }
      );
    }

    // Obtener estadísticas del plan usando la función de PostgreSQL
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_plan_stats', { user_id: user.id });

    if (statsError) {
      console.error('Error getting plan stats:', statsError);
      
      // Fallback: consultar directamente las tablas
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          subscription_plans:subscription_plan_id (
            name,
            slug,
            price,
            max_active_events,
            max_images_per_event,
            max_capacity_per_event,
            can_feature_events
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Error al obtener perfil' }),
          { status: 500 }
        );
      }

      // Contar TODOS los eventos activos (no solo del mes actual)
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .in('status', ['published', 'draft']);

      const planData = profile.subscription_plans as any;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          stats: {
            plan_name: planData?.name || 'Free',
            plan_slug: planData?.slug || 'free',
            price: planData?.price || 0,
            max_events_per_month: planData?.max_active_events,
            current_events_this_month: eventsCount || 0,
            max_images_per_event: planData?.max_images_per_event || 1,
            max_capacity_per_event: planData?.max_capacity_per_event,
            can_feature_events: planData?.can_feature_events || false,
            events_remaining: planData?.max_active_events ? (planData.max_active_events - (eventsCount || 0)) : null
          }
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats: stats && stats.length > 0 ? {
          plan_name: stats[0].plan_name,
          plan_slug: stats[0].plan_slug,
          price: stats[0].price || 0,
          max_events_per_month: stats[0].max_active_events,
          current_events_this_month: stats[0].current_active_events,
          max_images_per_event: stats[0].max_images_per_event,
          max_capacity_per_event: stats[0].max_capacity_per_event,
          can_feature_events: stats[0].can_feature_events,
          events_remaining: stats[0].events_remaining
        } : null
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

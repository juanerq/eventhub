import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, password, isOrganizer, subscriptionPlan, paymentConfirmed } = body;

    console.log('Signup request received:', { 
      name, 
      email, 
      isOrganizer, 
      subscriptionPlan, 
      paymentConfirmed 
    });

    // Validate required fields
    if (!name || !email || !password) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan campos requeridos' }),
        { status: 400 }
      );
    }

    // If it's a PRO plan, payment must be confirmed
    if (subscriptionPlan === 'pro' && !paymentConfirmed) {
      console.error('PRO plan requires payment confirmation');
      return new Response(
        JSON.stringify({ success: false, error: 'Se requiere confirmación de pago para el plan PRO' }),
        { status: 400 }
      );
    }

    console.log('Creating user account with Supabase...');

    // Create user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          is_organizer: isOrganizer || false,
          subscription_plan: subscriptionPlan || 'free',
        },
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);
      
      // Check if it's a duplicate email error
      if (error.message.toLowerCase().includes('already') || 
          error.message.toLowerCase().includes('existe') ||
          error.message.toLowerCase().includes('duplicate')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Este correo electrónico ya está registrado. Por favor inicia sesión o usa otro correo.',
            errorType: 'duplicate_email'
          }),
          { status: 409 }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400 }
      );
    }

    console.log('User created successfully:', data.user?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cuenta creada exitosamente',
        user: data.user 
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Server error during signup:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error del servidor' }),
      { status: 500 }
    );
  }
};

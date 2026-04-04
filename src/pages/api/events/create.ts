import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { uploadImage } from '../../../lib/storage';

export const POST: APIRoute = async ({ request, cookies }) => {
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

    // Check if user is an organizer
    const isOrganizer = user.user_metadata?.is_organizer || false;
    if (!isOrganizer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Solo organizadores pueden crear eventos' }),
        { status: 403 }
      );
    }

    // Get FormData from request
    const formData = await request.formData();
    
    // Extract event data
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const start_date = formData.get('start_date') as string;
    const city = formData.get('city') as string;
    
    // Múltiples imágenes
    const imageFiles = formData.getAll('event_images') as File[];

    // Validate required fields
    if (!title || !category || !start_date || !city) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan campos requeridos' }),
        { status: 400 }
      );
    }

    // Upload images if provided
    const uploadedImages: Array<{ url: string; order: number }> = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      
      // Validar que sea un archivo real (no vacío)
      if (!file || file.size === 0) continue;
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ success: false, error: `La imagen "${file.name}" no debe superar los 5MB` }),
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return new Response(
          JSON.stringify({ success: false, error: `"${file.name}" no es una imagen válida` }),
          { status: 400 }
        );
      }

      try {
        const imageUrl = await uploadImage(file, 'events');
        uploadedImages.push({ url: imageUrl, order: i });
      } catch (error: any) {
        console.error(`Error uploading image "${file.name}":`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error al subir "${file.name}": ${error.message || 'Error desconocido'}` 
          }),
          { status: 500 }
        );
      }
    }

    // Prepare event object (without image_url, now using event_images table)
    const event = {
      organizer_id: user.id,
      title,
      description: formData.get('description') as string || null,
      category,
      start_date,
      end_date: formData.get('end_date') as string || null,
      location_name: formData.get('location_name') as string || null,
      city,
      country: formData.get('country') as string || 'Colombia',
      address: formData.get('address') as string || null,
      latitude: formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null,
      longitude: formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null,
      price: formData.get('is_free') === 'true' ? 0 : parseFloat(formData.get('price') as string) || 0,
      capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : null,
      is_free: formData.get('is_free') === 'true',
      status: formData.get('status') as string || 'published',
      is_featured: false,
    };

    // Insert event into database using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert([event])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      
      // Detectar errores de límite de plan
      let errorMessage = 'Error al crear el evento';
      
      if (error.message.includes('límite de eventos')) {
        errorMessage = 'Has alcanzado el límite de eventos para tu plan. Actualiza a PRO para eventos ilimitados.';
      } else if (error.message.includes('capacidad máxima')) {
        errorMessage = 'La capacidad del evento excede el límite de tu plan. Actualiza a PRO para capacidad ilimitada.';
      } else if (error.message.includes('destacar eventos')) {
        errorMessage = 'Solo los usuarios PRO pueden destacar eventos.';
      } else if (error.code) {
        errorMessage = error.message;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage
        }),
        { status: 400 }
      );
    }

    // If event created successfully and there are images, insert them into event_images
    if (data && uploadedImages.length > 0) {
      const imagesToInsert = uploadedImages.map((img, index) => ({
        event_id: data.id,
        image_url: img.url,
        is_primary: index === 0, // Primera imagen es la primaria
        display_order: img.order
      }));

      const { error: imageError } = await supabaseAdmin
        .from('event_images')
        .insert(imagesToInsert);

      if (imageError) {
        console.error('Error inserting event images:', imageError);
        // Don't fail event creation because of image insert error, just log it
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event: data,
        message: 'Evento creado exitosamente'
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

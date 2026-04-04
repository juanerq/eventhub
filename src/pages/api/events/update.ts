import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { uploadImage, deleteImage } from '../../../lib/storage';

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
        JSON.stringify({ success: false, error: 'Solo organizadores pueden editar eventos' }),
        { status: 403 }
      );
    }

    // Get FormData from request
    const formData = await request.formData();
    
    // Extract event data
    const eventId = formData.get('id') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const start_date = formData.get('start_date') as string;
    const city = formData.get('city') as string;
    
    // Múltiples imágenes
    const newImageFiles = formData.getAll('event_images') as File[];
    const imagesToRemove = (formData.get('images_to_remove') as string || '').split(',').filter(id => id);

    // Validate required fields
    if (!eventId || !title || !category || !start_date || !city) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan campos requeridos' }),
        { status: 400 }
      );
    }

    // Verify event exists and belongs to user
    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('organizer_id', user.id)
      .single();

    if (fetchError || !existingEvent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Evento no encontrado o no tienes permiso para editarlo' }),
        { status: 404 }
      );
    }

    // Handle image updates - múltiples imágenes
    
    // 1. Eliminar imágenes marcadas para eliminar
    if (imagesToRemove.length > 0) {
      // Obtener URLs de las imágenes a eliminar
      const { data: imagesToDelete } = await supabaseAdmin
        .from('event_images')
        .select('id, image_url')
        .in('id', imagesToRemove)
        .eq('event_id', eventId);
      
      if (imagesToDelete && imagesToDelete.length > 0) {
        // Eliminar de Cloudinary
        for (const img of imagesToDelete) {
          await deleteImage(img.image_url);
        }
        
        // Eliminar de la base de datos
        await supabaseAdmin
          .from('event_images')
          .delete()
          .in('id', imagesToRemove);
      }
    }
    
    // 2. Obtener el display_order máximo actual
    const { data: existingImages } = await supabaseAdmin
      .from('event_images')
      .select('display_order')
      .eq('event_id', eventId)
      .order('display_order', { ascending: false })
      .limit(1);
    
    let nextDisplayOrder = existingImages && existingImages.length > 0 
      ? existingImages[0].display_order + 1 
      : 0;
    
    // 3. Subir nuevas imágenes
    const uploadedImages: Array<{ url: string; order: number }> = [];
    
    for (const file of newImageFiles) {
      // Validar que sea un archivo real (no vacío)
      if (!file || file.size === 0) continue;
      
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ success: false, error: `La imagen "${file.name}" no debe superar los 5MB` }),
          { status: 400 }
        );
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        return new Response(
          JSON.stringify({ success: false, error: `"${file.name}" no es una imagen válida` }),
          { status: 400 }
        );
      }

      // Subir imagen
      try {
        const imageUrl = await uploadImage(file, 'events');
        uploadedImages.push({ url: imageUrl, order: nextDisplayOrder });
        nextDisplayOrder++;
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
    
    // 4. Insertar nuevas imágenes en la base de datos (el trigger validará el límite)
    if (uploadedImages.length > 0) {
      // Verificar si ya existe una imagen primaria
      const { data: primaryImage } = await supabaseAdmin
        .from('event_images')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_primary', true)
        .single();
      
      const imagesToInsert = uploadedImages.map((img, index) => ({
        event_id: eventId,
        image_url: img.url,
        is_primary: !primaryImage && index === 0, // Primera imagen es primaria si no hay ninguna
        display_order: img.order
      }));
      
      const { error: insertError } = await supabaseAdmin
        .from('event_images')
        .insert(imagesToInsert);
      
      if (insertError) {
        // Si falla por límite, eliminar las imágenes subidas a Cloudinary
        for (const img of uploadedImages) {
          await deleteImage(img.url);
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: insertError.message || 'Error al guardar las imágenes'
          }),
          { status: 400 }
        );
      }
    }

    // Prepare update object (without image_url, now using event_images table)
    const updateData = {
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
      updated_at: new Date().toISOString(),
    };

    // Update event in database
    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('organizer_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message || 'Error al actualizar el evento'
        }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event: data,
        message: 'Evento actualizado exitosamente'
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

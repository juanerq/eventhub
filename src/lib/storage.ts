import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: import.meta.env.CLOUDINARY_CLOUD_NAME || 'ditmdfwa6',
  api_key: import.meta.env.CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Sube una imagen a Cloudinary
 * @param file - Archivo a subir
 * @param folder - Carpeta dentro de Cloudinary (ej: 'events')
 * @returns URL pública de la imagen subida o lanza un error
 */
export async function uploadImage(file: File, folder: string = 'events'): Promise<string> {
  try {
    // Validar que el archivo exista
    if (!file || file.size === 0) {
      throw new Error('Archivo vacío o inválido');
    }

    console.log(`Uploading image to Cloudinary: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Cloudinary usando upload_stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Error de almacenamiento: ${error.message}`));
            return;
          }

          if (!result || !result.secure_url) {
            reject(new Error('No se recibió URL de Cloudinary'));
            return;
          }

          console.log(`Image uploaded successfully to Cloudinary: ${result.secure_url}`);
          resolve(result.secure_url);
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error: any) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
}

/**
 * Elimina una imagen de Cloudinary
 * @param imageUrl - URL de la imagen a eliminar
 * @returns true si se eliminó correctamente
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Extraer public_id de la URL de Cloudinary
    // Ejemplo: https://res.cloudinary.com/ditmdfwa6/image/upload/v1234567890/events/abc123.jpg
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) {
      console.error('URL inválida de Cloudinary');
      return false;
    }

    // Obtener la parte después de /upload/v1234567890/
    const pathWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    // Remover extensión
    const publicId = pathWithExtension.replace(/\.[^/.]+$/, '');

    console.log(`Deleting image from Cloudinary: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log(`Image deleted successfully from Cloudinary: ${publicId}`);
      return true;
    }

    console.error('Error deleting from Cloudinary:', result);
    return false;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    return false;
  }
}

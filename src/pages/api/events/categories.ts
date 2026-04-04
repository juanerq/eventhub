import type { APIRoute } from 'astro';

// Mapeo de categorías con iconos
const categoryMetadata: Record<string, { name: string; icon: string }> = {
  concert: { name: 'Conciertos', icon: '🎵' },
  party: { name: 'Fiestas', icon: '🎉' },
  sports: { name: 'Deportes', icon: '⚽' },
  workshop: { name: 'Talleres', icon: '🎓' },
  networking: { name: 'Networking', icon: '🤝' },
  conference: { name: 'Conferencias', icon: '🎤' },
  exhibition: { name: 'Exposiciones', icon: '🎨' },
  theater: { name: 'Teatro', icon: '🎭' },
  other: { name: 'Otros', icon: '📅' },
};

export const GET: APIRoute = async () => {
  try {
    // Devolver todas las categorías predefinidas
    const categories = Object.entries(categoryMetadata).map(([id, meta]) => ({
      id,
      name: meta.name,
      icon: meta.icon,
    }));

    return new Response(
      JSON.stringify({ categories }),
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

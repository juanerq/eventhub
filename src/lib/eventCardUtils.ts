// Tipos para eventos
export interface EventData {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  city: string;
  country: string;
  address?: string;
  price: number;
  is_free: boolean;
  is_featured?: boolean;
  image_url?: string;
  category: string;
}

// Iconos por categoría
const categoryIcons: Record<string, string> = {
  concert: "🎵",
  party: "🎉",
  sports: "⚽",
  workshop: "🎓",
  networking: "🤝",
  conference: "🎤",
  exhibition: "🎨",
  theater: "🎭",
  other: "📅",
};

// Formatear fecha
export function formatEventDate(dateString: string): string {
  const startDate = new Date(dateString);
  return startDate.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Obtener icono de categoría
export function getCategoryIcon(category: string): string {
  return categoryIcons[category] || "📅";
}

// Truncar descripción
function truncateDescription(description: string | undefined): string | null {
  if (!description) return null;
  return description.length > 100 
    ? description.substring(0, 100) + "..."
    : description;
}

// Generar HTML de tarjeta para explorar eventos
export function createExploreEventCard(event: EventData, index: number): string {
  const formattedDate = formatEventDate(event.start_date);
  const categoryIcon = getCategoryIcon(event.category);
  const imageUrl = event.image_url || "https://via.placeholder.com/400x220?text=Evento";
  const truncatedDesc = truncateDescription(event.description);
  
  const price = event.is_free
    ? '<span class="price-tag free">Gratis</span>'
    : `<span class="price-tag">$${event.price.toLocaleString()}</span>`;

  const featuredClass = event.is_featured ? "event-featured" : "";
  const featuredBadge = event.is_featured
    ? '<div class="event-featured-badge"><span>⭐</span><span>Destacado</span></div>'
    : "";

  const descriptionHtml = truncatedDesc 
    ? `<p class="event-description">${truncatedDesc}</p>`
    : "";

  const addressHtml = event.address
    ? `
      <div class="event-detail event-address">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
          <circle cx="12" cy="9" r="2.5" fill="none"></circle>
        </svg>
        <span>${event.address}</span>
      </div>`
    : "";

  return `
    <a href="/event/${event.id}" class="event-card ${featuredClass}" style="animation-delay: ${index * 0.1}s">
      ${featuredBadge}
      <div class="event-image-wrapper">
        <img src="${imageUrl}" alt="${event.title}" class="event-image" onerror="this.src='https://via.placeholder.com/400x220?text=Evento'">
      </div>
      <div class="event-content">
        <span class="event-category">
          <span>${categoryIcon}</span>
          <span>${event.category}</span>
        </span>
        <h4 class="event-title">${event.title}</h4>
        ${descriptionHtml}
        <div class="event-details">
          <div class="event-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${formattedDate}</span>
          </div>
          <div class="event-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${event.city}, ${event.country}</span>
          </div>
          ${addressHtml}
        </div>
        <div class="event-footer">
          ${price}
          <div class="event-action">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </a>
  `;
}

// Generar HTML de tarjeta para mis eventos
export function createMyEventCard(event: EventData, index: number): string {
  const formattedDate = formatEventDate(event.start_date);
  const categoryIcon = getCategoryIcon(event.category);
  const imageUrl = event.image_url || "https://via.placeholder.com/400x220?text=Evento";
  
  const price = event.is_free
    ? '<span class="price-tag free">Gratis</span>'
    : `<span class="price-tag">$${event.price.toLocaleString()}</span>`;

  return `
    <div class="event-card" style="animation-delay: ${index * 0.1}s">
      <div class="event-image-wrapper">
        <img src="${imageUrl}" alt="${event.title}" class="event-image" onerror="this.src='https://via.placeholder.com/400x220?text=Evento'">
      </div>
      <div class="event-content">
        <span class="event-category">
          <span>${categoryIcon}</span>
          <span>${event.category}</span>
        </span>
        <h4 class="event-title">${event.title}</h4>
        <div class="event-details">
          <div class="event-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${formattedDate}</span>
          </div>
          <div class="event-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${event.city}, ${event.country}</span>
          </div>
        </div>
        <div class="event-footer">
          ${price}
          <div class="event-actions-buttons">
            <a href="/edit-event/${event.id}" class="btn-edit" title="Editar evento">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </a>
            <button class="btn-delete" data-event-id="${event.id}" title="Eliminar evento">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

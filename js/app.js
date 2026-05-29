// Load featured events on homepage
async function loadFeaturedEvents() {
    const container = document.getElementById('featuredEvents');
    if (!container) return;
    
    container.innerHTML = '<p>Loading events...</p>';
    
    const events = await getFeaturedEvents();
    
    if (events.length === 0) {
        container.innerHTML = '<p>No events found</p>';
        return;
    }
    
    container.innerHTML = events.map(event => createEventCard(event)).join('');
}

// Load all events on events page
async function loadAllEvents() {
    const container = document.getElementById('allEvents');
    if (!container) return;
    
    container.innerHTML = '<p>Loading events...</p>';
    
    const events = await getEvents();
    
    if (events.length === 0) {
        container.innerHTML = '<p>No events found</p>';
        return;
    }
    
    container.innerHTML = events.map(event => createEventCard(event)).join('');
}

// Create event card HTML
function createEventCard(event) {
    const spotsLeft = event.participantLimit - event.currentRegistrations;
    const spotsClass = spotsLeft > 0 ? 'spots-available' : 'spots-full';
    const spotsText = spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event Full';
    
    const categoryIcons = {
        workshop: 'fa-laptop-code',
        hackathon: 'fa-code',
        cultural: 'fa-music',
        sports: 'fa-futbol',
        seminar: 'fa-chalkboard-user'
    };
    
    const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'Date TBA';
    
    return `
        <div class="event-card">
            <div class="event-card-header">
                <h3><i class="fas ${categoryIcons[event.category] || 'fa-calendar'}"></i> ${event.eventName}</h3>
                <span class="event-badge">${event.category?.toUpperCase() || 'GENERAL'}</span>
            </div>
            <div class="event-card-body">
                <p>${event.description?.substring(0, 100) || ''}${event.description?.length > 100 ? '...' : ''}</p>
                <div class="event-info">
                    <p><i class="fas fa-calendar-alt"></i> ${eventDate}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.venue || 'Venue TBA'}</p>
                    <p><i class="fas fa-users"></i> By: ${event.organizerName || 'Organizer'}</p>
                </div>
                <div class="event-spots">
                    <span class="${spotsClass}"><i class="fas fa-ticket-alt"></i> ${spotsText}</span>
                </div>
            </div>
        </div>
    `;
}

// Run when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Load featured events if on homepage
    if (document.getElementById('featuredEvents')) {
        loadFeaturedEvents();
    }
    
    // Load all events if on events page
    if (document.getElementById('allEvents')) {
        loadAllEvents();
    }
    
    console.log("✅ Frontend connected to MongoDB via API!");
});
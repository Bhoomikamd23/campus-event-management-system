// API URL (your backend)
const API_URL = 'http://localhost:5000/api';

// Fetch real events from MongoDB
async function getEvents() {
    try {
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const events = await response.json();
        console.log('✅ Events loaded from MongoDB:', events);
        return events;
    } catch (error) {
        console.error('❌ Error fetching events:', error);
        // Fallback to mock data if backend is not running
        return getMockEvents();
    }
}

// Mock events as backup (if backend is down)
function getMockEvents() {
    return [
        {
            _id: "1",
            eventName: "AI & Machine Learning Workshop",
            description: "Learn the fundamentals of AI and ML",
            date: "2024-12-15",
            venue: "CS Lab 301",
            category: "workshop",
            participantLimit: 50,
            currentRegistrations: 32,
            organizerName: "Dr. Sarah Johnson"
        },
        {
            _id: "2",
            eventName: "CodeFiesta Hackathon",
            description: "24-hour coding competition",
            date: "2024-12-20",
            venue: "Main Auditorium",
            category: "hackathon",
            participantLimit: 100,
            currentRegistrations: 45,
            organizerName: "Coding Club"
        }
    ];
}

// Get single event by ID
async function getEventById(eventId) {
    try {
        const response = await fetch(`${API_URL}/events/${eventId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching event:', error);
        return null;
    }
}

// For featured events (first 3)
async function getFeaturedEvents() {
    const events = await getEvents();
    return events.slice(0, 3);
}
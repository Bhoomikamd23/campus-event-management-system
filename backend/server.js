const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/campus_events')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// AUTO-CREATE COLLECTIONS - ADD THIS LINE
mongoose.set('autoCreate', true);
mongoose.set('autoIndex', true);

// User Schema
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
    rollNumber: String,
    department: String
}, { timestamps: true }));

const JWT_SECRET = 'campus_secret_2024';

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role, rollNumber, department } = req.body;
        
        console.log('Registration attempt:', email);
        
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role, rollNumber, department });
        await user.save();
        
        console.log('User registered successfully:', email);
        
        const token = jwt.sign({ id: user._id, email, role }, JWT_SECRET);
        res.json({ token, user: { id: user._id, name, email, role } });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);
        
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user._id, email, role: user.role }, JWT_SECRET);
        res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Events
app.get('/api/events', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const events = await db.collection('events').find({}).toArray();
        res.json(events);
    } catch (err) {
        res.json([]);
    }
});

// Register for Event
app.post('/api/registrations', async (req, res) => {
    try {
        const { eventId, studentId } = req.body;
        const db = mongoose.connection.db;
        const { ObjectId } = require('mongodb');
        
        console.log('Registration request:', { eventId, studentId });
        
        const existing = await db.collection('registrations').findOne({
            eventId: eventId,
            studentId: studentId
        });
        
        if (existing) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }
        
        const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        if (event.currentRegistrations >= event.participantLimit) {
            return res.status(400).json({ message: 'Event is full' });
        }
        
        await db.collection('registrations').insertOne({
            eventId: eventId,
            studentId: studentId,
            registrationDate: new Date(),
            status: 'registered'
        });
        
        await db.collection('events').updateOne(
            { _id: new ObjectId(eventId) },
            { $inc: { currentRegistrations: 1 } }
        );
        
        res.json({ message: 'Successfully registered for event!' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get user's registrations (for dashboard)
app.get('/api/registrations/my/:studentId', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const { ObjectId } = require('mongodb');
        
        console.log('Fetching registrations for student:', req.params.studentId);
        
        const registrations = await db.collection('registrations')
            .find({ studentId: req.params.studentId })
            .toArray();
        
        if (registrations.length === 0) {
            return res.json([]);
        }
        
        const eventIds = registrations.map(r => new ObjectId(r.eventId));
        const events = await db.collection('events')
            .find({ _id: { $in: eventIds } })
            .toArray();
        
        const result = registrations.map(reg => ({
            registrationId: reg._id,
            registrationDate: reg.registrationDate,
            event: events.find(e => e._id.toString() === reg.eventId)
        }));
        
        res.json(result);
    } catch (err) {
        console.error('Error fetching registrations:', err);
        res.status(500).json({ message: err.message });
    }
});

// Cancel registration
app.delete('/api/registrations/:eventId', async (req, res) => {
    try {
        const { studentId } = req.body;
        const db = mongoose.connection.db;
        const { ObjectId } = require('mongodb');
        
        const result = await db.collection('registrations').deleteOne({
            eventId: req.params.eventId,
            studentId: studentId
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Registration not found' });
        }
        
        await db.collection('events').updateOne(
            { _id: new ObjectId(req.params.eventId) },
            { $inc: { currentRegistrations: -1 } }
        );
        
        res.json({ message: 'Registration cancelled successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend running!' });
});
// ============ ORGANIZER EVENT ROUTES ============

// Create new event (Organizer only)
// ============ ORGANIZER EVENT ROUTES ============

// Create new event
app.post('/api/organizer/events', async (req, res) => {
    try {
        console.log('📝 Create event request received:', req.body);
        
        const { eventName, description, date, venue, category, participantLimit, organizerId, organizerName } = req.body;
        
        // Validate required fields
        if (!eventName || !venue || !date) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields: eventName, venue, date are required' 
            });
        }
        
        const db = mongoose.connection.db;
        const { ObjectId } = require('mongodb');
        
        const newEvent = {
            eventName: eventName,
            description: description || '',
            date: new Date(date),
            venue: venue,
            category: category || 'workshop',
            participantLimit: parseInt(participantLimit) || 100,
            currentRegistrations: 0,
            organizerId: organizerId,
            organizerName: organizerName || 'Organizer',
            status: "upcoming",
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('events').insertOne(newEvent);
        
        console.log('✅ Event saved to MongoDB with ID:', result.insertedId);
        
        res.status(201).json({ 
            success: true, 
            message: 'Event created successfully',
            event: { ...newEvent, _id: result.insertedId }
        });
    } catch (err) {
        console.error('❌ Create event error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

// Get events by organizer
app.get('/api/organizer/my-events/:organizerId', async (req, res) => {
    try {
        console.log('📋 Fetching events for organizer:', req.params.organizerId);
        
        const db = mongoose.connection.db;
        const events = await db.collection('events')
            .find({ organizerId: req.params.organizerId })
            .sort({ createdAt: -1 })
            .toArray();
        
        console.log(`✅ Found ${events.length} events for organizer`);
        res.json(events);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

// Update event
app.put('/api/organizer/events/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { eventName, description, date, venue, category, participantLimit } = req.body;
        
        console.log('📝 Updating event:', eventId);
        
        const db = mongoose.connection.db;
        const { ObjectId } = require('mongodb');
        
        const updateData = {
            eventName: eventName,
            description: description || '',
            date: new Date(date),
            venue: venue,
            category: category,
            participantLimit: parseInt(participantLimit),
            updatedAt: new Date()
        };
        
        const result = await db.collection('events').updateOne(
            { _id: new ObjectId(eventId) },
            { $set: updateData }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found or no changes made' 
            });
        }
        
        console.log('✅ Event updated successfully:', eventId);
        
        res.json({ 
            success: true, 
            message: 'Event updated successfully' 
        });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

// Delete event
app.delete('/api/organizer/events/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { organizerId } = req.body;
        
        console.log('🗑️ Deleting event:', eventId, 'by organizer:', organizerId);
        
        const db = mongoose.connection.db;
        const { ObjectId } = require('mongodb');
        
        // First, check if event exists and belongs to organizer
        const event = await db.collection('events').findOne({ 
            _id: new ObjectId(eventId),
            organizerId: organizerId
        });
        
        if (!event) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found or you do not have permission' 
            });
        }
        
        // Delete all registrations for this event
        const regResult = await db.collection('registrations').deleteMany({ eventId: eventId });
        console.log(`📋 Deleted ${regResult.deletedCount} registrations`);
        
        // Delete the event
        const eventResult = await db.collection('events').deleteOne({ _id: new ObjectId(eventId) });
        
        if (eventResult.deletedCount === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found' 
            });
        }
        
        console.log('✅ Event deleted successfully:', eventId);
        
        res.json({ 
            success: true, 
            message: 'Event deleted successfully' 
        });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});
const PORT = 5002;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
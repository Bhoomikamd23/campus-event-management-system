const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to verify token
const auth = (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (!token) {
        return res.status(401).json({ message: 'No token' });
    }
    try {
        const decoded = jwt.verify(token, 'secretkey123');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// REGISTER for an event
router.post('/', auth, async (req, res) => {
    try {
        const { eventId } = req.body;
        const db = req.app.locals.db;
        
        // Check if event exists
        const event = await db.collection('events').findOne({ _id: eventId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        // Check if already registered
        const existing = await db.collection('registrations').findOne({
            studentId: req.user.id,
            eventId: eventId
        });
        
        if (existing) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }
        
        // Check if event is full
        if (event.currentRegistrations >= event.participantLimit) {
            return res.status(400).json({ message: 'Event is full' });
        }
        
        // Create registration
        await db.collection('registrations').insertOne({
            studentId: req.user.id,
            eventId: eventId,
            registrationDate: new Date(),
            status: 'registered'
        });
        
        // Update event count
        await db.collection('events').updateOne(
            { _id: eventId },
            { $inc: { currentRegistrations: 1 } }
        );
        
        res.json({ message: 'Successfully registered for event!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET my registrations
router.get('/my', auth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const registrations = await db.collection('registrations')
            .find({ studentId: req.user.id })
            .toArray();
        
        // Get event details for each registration
        const eventIds = registrations.map(r => r.eventId);
        const events = await db.collection('events')
            .find({ _id: { $in: eventIds } })
            .toArray();
        
        const myEvents = registrations.map(reg => ({
            registrationId: reg._id,
            registrationDate: reg.registrationDate,
            event: events.find(e => e._id === reg.eventId)
        }));
        
        res.json(myEvents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CANCEL registration
router.delete('/:eventId', auth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const result = await db.collection('registrations').deleteOne({
            studentId: req.user.id,
            eventId: req.params.eventId
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Registration not found' });
        }
        
        // Decrease event count
        await db.collection('events').updateOne(
            { _id: req.params.eventId },
            { $inc: { currentRegistrations: -1 } }
        );
        
        res.json({ message: 'Registration cancelled successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
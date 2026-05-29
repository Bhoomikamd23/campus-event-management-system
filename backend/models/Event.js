const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    venue: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['workshop', 'hackathon', 'cultural', 'sports', 'seminar'],
        required: true
    },
    participantLimit: {
        type: Number,
        default: 100
    },
    currentRegistrations: {
        type: Number,
        default: 0
    },
    organizerName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
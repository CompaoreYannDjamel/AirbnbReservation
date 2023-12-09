const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  airbnbId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  bookingDate: {
    type: Date,
    required: true,
  },
});

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;

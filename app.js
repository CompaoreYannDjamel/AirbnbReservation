
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const Airbnb = require('./models/airbnb');
const Reservation = require('./models/reservation');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'my_secret',
  resave: false,
  saveUninitialized: false,
}));

mongoose.connect('mongodb+srv://Yann:root@cluster0.ckpgmlh.mongodb.net/sample_airbnb', { useNewUrlParser: true, useUnifiedTopology: true });

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


app.post('/register', async (req, res) => {
  const { firstName, lastName, dateOfBirth, username, password, phoneNumber } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send('Username already registered. Please use a different email.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      dateOfBirth,
      username,
      password: hashedPassword,
      phoneNumber,
    });

    await newUser.save();

    res.sendFile(path.join(__dirname, 'public', 'login.html'));

  } catch (error) {
    console.error('Error during registration:', error);
    res.send('An error occurred during registration.');
  }
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: username });

    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.user = user;
      res.redirect('/dashboard');
    } else {
      res.send('Incorrect username or password.');
    }
  } catch (error) {
    res.send('An error occurred during login.');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});


app.get('/profile', isAuthenticated, (req, res) => {
  res.render('profile', { user: req.session.user });
});

app.post('/update-profile', isAuthenticated, async (req, res) => {
  const userId = req.session.user._id;

  try {
    await User.findByIdAndUpdate(userId, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
    });

    const updatedUser = await User.findById(userId);

    req.session.user = updatedUser;

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.send('An error occurred during profile update.');
  }
});

app.post('/search', async (req, res) => {
  try {
    const { bedrooms, minNights, maxNights } = req.body;

    const query = {
      bedrooms: { $gte: parseInt(bedrooms, 10) },
      minimum_nights: { $gte: parseInt(minNights, 10) },
      maximum_nights: { $lte: parseInt(maxNights, 10) },
    };

    const accommodations = await Airbnb.find(query);

    res.render('search-results', { accommodations });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/book', isAuthenticated, async (req, res) => {
  const { airbnbId } = req.body;
  const userId = req.session.user._id;
  try {
    const existingReservation = await Reservation.findOne({ airbnbId, userId });
    if (existingReservation) {
      return res.json({ success: false, message: 'You have already booked this accommodation.' });
    }

    const newReservation = new Reservation({
      airbnbId,
      userId,
      bookingDate: new Date(),
    });

    await newReservation.save();

    res.json({ success: true, message: 'Booking successful!' });
  } catch (error) {
    console.error('Error during booking:', error);
    res.json({ success: false, message: 'An error occurred during booking.' });
  }
});


app.get('/reviews/:airbnbId', async (req, res) => {
  try {
    const { airbnbId } = req.params;
    const accommodation = await Airbnb.findById(airbnbId);

    if (!accommodation) {
      return res.status(404).send('Accommodation not found');
    }

    res.render('reviews', { accommodation });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/add-review/:airbnbId', async (req, res) => {
  try {
    const { airbnbId } = req.params;
    const accommodation = await Airbnb.findById(airbnbId);

    if (!accommodation) {
      return res.status(404).send('Accommodation not found');
    }

    res.render('add-review', { accommodation });
  } catch (error) {
    console.error('Error fetching accommodation for review:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/submit-review/:airbnbId', async (req, res) => {
  try {
    const { airbnbId } = req.params;
    const { reviewerName, comments } = req.body;
    const userId = req.session.user._id;

    
    const accommodation = await Airbnb.findById(airbnbId);

    if (!accommodation) {
      return res.status(404).send('Accommodation not found');
    }

    const existingReservation = await Reservation.findOne({ airbnbId, userId });
    if (!existingReservation) {
      return res.json({ success: false, message: 'You cannot add review!' });
    }


    // Add the new review
    accommodation.reviews.push({
     
      reviewer_name: reviewerName,
      date: new Date(),
      comments,
    });

    // Save the updated accommodation
    await accommodation.save();

    res.redirect(`/reviews/${airbnbId}`);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

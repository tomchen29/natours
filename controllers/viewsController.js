const Tour = require('../models/tourModel')
const User = require('../models/userModel')
const Booking = require('../models/bookingModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')

// Express will automatically look for overview.pug because we've specified below line in app.js
// app.set('views', path.join(__dirname, 'views'))
exports.getoverview = catchAsync(async (req, res) => {
  // 1) Get tour data from MongoDB
  const tours = await Tour.find()

  // 2) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours: tours
  })
})

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) get the data for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    // need to use path because we are populating attributes from a ref object within tour
    path: 'reviews',
    fields: 'review rating user'
  })

  if (!tour) {
    // create an error here, which will then be passed down to Global error handling middlware
    return next(new AppError('There is no tour with that name.', 404))
  }

  // 3) Render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  })
})

exports.getLoginForm = catchAsync(async (req, res, next) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  })
})

exports.getSignupForm = catchAsync(async (req, res, next) => {
  res.status(200).render('signup', {
    title: 'Sign up an account'
  })
})

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  })
}

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id })

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map(el => el.tour)
  const tours = await Tour.find({ _id: { $in: tourIDs } })

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  })
})

exports.alerts = (req, res, next) => {
  const { alert } = req.query
  if (alert === 'booking')
    res.locals.alert =
      "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediately, please come back later"
  next()
}

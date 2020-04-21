const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Tour = require('./../models/tourModel')
const User = require('./../models/userModel')
const Booking = require('./../models/bookingModel')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId)

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // // not really secure, but could be a tempt workaround
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    // referral info in Stripe payment CRM
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`
        ],
        amount: tour.price * 100, // unit is in cents
        currency: 'usd',
        quantity: 1
      }
    ]
  })

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session
  })
})

// [Deprecated] Implemetnation of booking with webhook
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is only TEMPORARY, because it's UNSECURE
//   // With this workaround, everyone can make bookings without paying
//   const { tour, user, price } = req.query

//   if (!tour && !user && !price) return next()
//   await Booking.create({ tour, user, price })

//   // redirect to the home page, which will hit the viewRoutes.route('/')
//   res.redirect(req.originalUrl.split('?')[0])
// })

const createBookingCheckout = async session => {
  const tour = session.client_reference_id
  const user = (await User.findOne({ email: session.customer_email })).id
  const price = session.display_items[0].amount / 100
  await Booking.create({ tour, user, price })
}

// this function will be called after getting the response of router.get('/checkout-session/:tourId', bookingController.getCheckoutSession)
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send(`Weebook error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object)
    return res.status(200).json({ received: true })
  } else {
    return res.status(400).send(`Weird error happen!`)
  }
}

exports.createBooking = factory.createOne(Booking)
exports.getBooking = factory.getOne(Booking)
exports.getAllBookings = factory.getAll(Booking)
exports.updateBooking = factory.updateOne(Booking)
exports.deleteBooking = factory.deleteOne(Booking)

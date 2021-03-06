const path = require('path')
const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const compression = require('compression')
const cors = require('cors')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorController')
const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')
const bookingRouter = require('./routes/bookingRoutes')
const bookingController = require('./controllers/bookingController')

const viewRouter = require('./routes/viewRoutes')

// Start express app
const app = express()
app.enable('trust proxy') // enable Heroku redirected proxy

// Express automatically support all the most common template engine, such as Pug
app.set('view engine', 'pug')
// Define the render router to search in ./views folder
app.set('views', path.join(__dirname, 'views'))

// 1) GLOBAL MIDDLEWARES
// Implement CORS for to grant GET/POST request access for any origin
app.use(cors())
// Implement CORS for complicated request access for any origin
app.options('*', cors())

// Serve static file
// express.static will set up the default route of the app, where it will try searching in ${__dirname}/public if it couldn't find the requested path
// in the below line, we can use url like '127.0.0.1:3000/overview.html' directly
app.use(express.static(path.join(__dirname, 'public')))

// Set security HTTP headers
app.use(helmet())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')) // morgan is a logger middleware
}

// Limit requests from the same IP to 100 times per hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
})
app.use('/api', limiter)

// reason why we don't define the post method in router is because: in webhookCheckout handler function, when we receive the body from Stripe, the Strip function that's going to read the body requires the body in raw form (in a string instead of json)
// however if we hit line 67, the body parser will convert all the input into JSON
app.post(
  '/webhook-checkout',
  bodyParser.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
)

// Parse req.body and browser cookie
app.use(express.json({ limit: '10kb' })) // only accept the request within 10kb size
app.use(express.urlencoded({ extended: true, limit: '10kb' })) // middleware that handles data coming from the form
app.use(cookieParser())

// Data sanitization against NoSQL query injection
// i.e. "email": {"$gt": ""}
app.use(mongoSanitize())

// Data sanitization against cross-site scripting (XSS)
// i.e. "username": "<div>bad_code</div>"
app.use(xss())

// Data sanitization against http parameter polution
// i.e. http://127.0.0.1:3000/api/v1/tours/sort=price&sort=duration
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
)

// Compress text
app.use(compression())

// Insert pre-defined attributes to request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString()
  next()
})

// 2) ROUTES
/* Website */
app.use('/', viewRouter) // asign the root path of the router to root

/* API */
app.use('/api/v1/tours', tourRouter) // asign the root path of the router to '/api/v1/tours'
app.use('/api/v1/users', userRouter) // asign the root path of the router to '/api/v1/users'
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/bookings', bookingRouter)

// 3) ERROR HANDLING
// app.all() is a special routing method, used to load middleware functions at a path for all HTTP request methods
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
})
// by passing a function with 4 parameters into app.use, it automatically know this is an error handler
app.use(globalErrorHandler)

// 3) EXPORT TO THE SERVER FILE
module.exports = app

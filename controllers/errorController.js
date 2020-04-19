const AppError = require('./../utils/appError')

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`
  return new AppError(message, 400) // 400 means bad request
}

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0]
  const message = `Duplicate field value: ${value}. Please use another value`
  return new AppError(message, 400)
}

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message)
  const message = `Invalid input data. ${errors.join('; ')}`
  return new AppError(message, 400)
}

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401)

const handleJWTExpiredError = () =>
  new AppError('Your token has expired, please log in again', 401)

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    })
  }
  // B) RENDERED WEBSITE
  console.error('ERROR 💣', err)
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  })
}

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // Scenario I: Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      })
    }
    // Scenario II: Programming or other unknown error: don't leak error details
    console.error('ERROR 💣', err)
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    })
  }

  // B) RENDERED WEBSITE
  if (err.isOperational) {
    // Scenario I: Operational, trusted error: send message to client
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    })
  }
  // Scenario II: Programming or other unknown error: don't leak error details
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later!'
  })
}

// by passing a function with 4 parameters into middleware, it automatically know this is an error handler
module.exports = (err, req, res, next) => {
  // save err.methods as properties
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res)
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err } // hard copy error
    error.message = err.message
    // tackle with Operational Error
    if (error.name === 'CastError') error = handleCastErrorDB(error)
    if (error.code === 11000) error = handleDuplicateFieldsDB(error)
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error)
    if (error.name === 'JsonWebTokenError') error = handleJWTError()
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError()
    sendErrorProd(error, req, res)
  }
}

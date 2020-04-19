class AppError extends Error {
  constructor(message, statusCode) {
    // set the message property to all incoming error message
    super(message)

    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true

    // log all the stacks related to the error
    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = AppError

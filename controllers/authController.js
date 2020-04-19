const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const Email = require('./../utils/email')

const signtoken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

const createSendToken = (user, statusCode, req, res) => {
  const token = signtoken(user._id)

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // cookie cannot be modified by the browser
    // requires the connection to be https while in production
    secure: req.secure || req.headers('x-forwarded-proto') === 'https'
  })

  // remove the password from output
  user.password = undefined

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user
    }
  })
}

exports.signup = catchAsync(async (req, res, next) => {
  // instead of just using req.body, we only allow data we need
  // this will prevent the api caller to insert protected attribute, such as "role"
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role // for testing purpose. We should never do this in real life
  })
  const url = `${req.protocol}://${req.get('host')}/me`
  // console.log(url)
  await new Email(newUser, url).sendWelcome()
  createSendToken(newUser, 201, req, res)
})

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400))
  }

  // 2) Check if user exists && password  correct
  const user = await User.findOne({ email: email }).select('+password') // select the field that's originally excluded

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401))
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res)
})

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // expires in 10s
    httpOnly: true
  })
  res.status(200).json({
    status: 'success'
  })
}

// Check user authentication info, and insert the user obj to payload
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token
  if (
    // if api request
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies.jwt) {
    // if web request
    token = req.cookies.jwt
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to access...')
    )
  }

  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  // 3) Check if userid still exists in MongoDB
  // this will help mitigate bugs from simultaneous account deletion
  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(
      new AppError(
        'The user associated with this token not longer exist...',
        401
      )
    )
  }

  // 4) Check if user changed password after the JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please log in again.', 401)
    )
  }

  // 5) If all checks passed, grant access and go to the protected route
  req.user = currentUser // insert the user info to the payload that will be passed into next middleware
  res.locals.user = currentUser // // pub template can get access to all the variables stored in res.locals directly
  next()
})

// Only for rendered pages. Use local try catch instead of catchAsync()
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // if web request
      token = req.cookies.jwt

      // 1) Verify token
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

      // 2) Check if userid still exists in MongoDB
      // this will help mitigate bugs from simultaneous account deletion
      const currentUser = await User.findById(decoded.id)
      if (!currentUser) {
        return next()
      }

      // 3) Check if user changed password after the JWT was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next()
      }

      // 4) If all checks passed, there is a LOGGED-IN USER
      res.locals.user = currentUser // pub template can get access to all the variables stored in res.locals directly
      return next()
    } catch (err) {
      return next()
    }
  }
  next() // in case there is no cookie, or in another word NO LOGGED-IN USER
}

// the input parameter creates an array with all the arguments we specified
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        // 403 means forbidden
        new AppError('You do not have permission to perform this action', 403)
      )
    }
    next()
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Check if the user email exists
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError('There is no user with email address...', 404))
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false }) // update the token value in the user document

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`
    await new Email(user, resetURL).sendpasswordReset()

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save({ validateBeforeSave: false })

    return next(
      new AppError('There was an error sending the email. Try again later', 500)
    )
  }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex') // we specify the parameter in the url "/:token"

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() } //@TODO: deal with undefined value
  })

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400))
  }
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined

  // 3) Update all properties (including passwordChangedAt) for the user
  await user.save()

  // 4) Log the user in, send JWT to the client
  createSendToken(user, 200, req, res)
})

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password')

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401))
  }
  // 3) If so, update password
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  await user.save() // User.findByIdAndUpdate will not work as intended!!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res)
})

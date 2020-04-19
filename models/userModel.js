const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // this is not a validator. It automatically converts the email address to lower case
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a valid password'],
    minlength: 8, // require the password to be at least 8 chars
    select: false // does not include the password in the payload sent back to client
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE
      validator: function(el) {
        return el === this.password
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
})

// pre middleware for password encryption
userSchema.pre('save', async function(next) {
  // only run the function if password was actually modified
  if (!this.isModified('password')) return next()

  // hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12) // 12 indicates how much CPU resource the algorithm can use

  // delete passwordConfirm field
  this.passwordConfirm = undefined
  next()
})

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next()

  // - 1000 to ensure the changedPasswordAfter() will not break
  // this is in case that the JWT runs slow and gets ahead of password update
  this.passwordChangedAt = Date.now() - 1000
  next()
})

userSchema.pre(/^find/, function(next) {
  // apply a middleware to all select queries that start with "find "
  // 'this' points to the current query
  this.find({ active: { $ne: false } })
  next()
})

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    // convrt the timestamp from milliseconds to seconds in integer
    // need to do this change because JWTTimestamp is in seconds
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10 // 10 means the decimal
    )
    return JWTTimestamp < changedTimestamp // if last change happens after the token, then the token should be expired
  }

  // False means no change
  return false
}

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex') // this is like a temp 'password' sent to user, and ask them to update the temp password

  this.passwordResetToken = crypto
    .createHash('sha256') // use 'sha256' algorithm
    .update(resetToken) // input the temp password generated from the server side
    .digest('hex')

  // console.log(`The original reset password token is: ${resetToken}`)
  // console.log(
  //   `The encrypted reset password token is: ${this.passwordResetToken}`
  // )

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // expires in 10 mins
  return resetToken
}

// construct the user model
const User = mongoose.model('User', userSchema)

module.exports = User

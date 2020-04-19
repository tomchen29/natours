const multer = require('multer') // multer is a popular middlware to handle multi-part form data
const sharp = require('sharp') // image processing library
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const factory = require('./handlerFactory')

const filterObj = (obj, ...allowedFields) => {
  const newObj = {}
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el]
  })
  return newObj
}

exports.uploadUserPhoto = multer({
  storage: multer.memoryStorage(), // store file in memory for future processing
  // verify if the uploaded file is an img or not
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, true)
    } else {
      cb(new AppError('Not an image! Please upload only image!'), false)
    }
  }
}).single('photo')

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next()
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`

  // process the buffered image passed by multer
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`)

  next()
})

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id
  next()
}

exports.updateMe = catchAsync(async (req, res, next) => {
  // the req.user has been instantiated by authController.protect
  // 1) Create error if user POSTs passwrod data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    )
  }
  // 2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email')
  if (req.file) filteredBody.photo = req.file.filename //multer will storage the upload file into req.file and pass to the consecutive middlewares

  // 3) Update user document with non-sensitive data
  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  })

  res.status(200).json({
    status: 'success',
    data: {
      user: updateUser
    }
  })
})

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false })
  res.status(204).json({
    status: 'success',
    data: null
  })
})

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup instead!'
  })
}

exports.getUser = factory.getOne(User)
exports.getAllUsers = factory.getAll(User)
exports.updateUser = factory.updateOne(User)
exports.deleteUser = factory.deleteOne(User)

const mongoose = require('mongoose')
const slugify = require('slugify')
const User = require('./userModel')
// const validator = require('validator')

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have <= 40 characters'],
      minlength: [10, 'A tour name must have >= 10 characters']
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficuly is either: easy, medium, or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // the set condition will be run each time when a new value is set
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a default price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only points to current doc on NEW document creation
          return val < this.price
        },
        message: 'Discount price ({VALUE}) should be lower than orginal price'
      }
    },
    summary: {
      type: String,
      trim: true, // only works for string, remove all the white spaces at the beginning and at the end
      required: [true, 'A tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    // an array of string
    images: [String],
    // set the create time automatically
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    // an array of different dates of the tour
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    // refer to the User object in MongoDB
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

tourSchema.index({ price: 1, ratingsAverage: -1 }) // 1 means ascending order; -1 means descending
tourSchema.index({ slug: 1 })
tourSchema.index({ startLocation: '2dsphere' })

// create a virtual property
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7 // this points to the current document
})

// Virtual populate the reviews related to the tour
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // the foreign key in the Review model is 'tour'
  localField: '_id' // the referrence key inside the Tour model
})

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true })
  next()
})

// embed the tour guides' info into the Tour document
tourSchema.pre('save', async function(next) {
  const guidesPromises = this.guides.map(async id => await User.findById(id))
  this.guides = await Promise.all(guidesPromises)
  next()
})

// QUERY MIDDLEWARE: runs before Tour.find(), Tour.findById(), and so on
tourSchema.pre(/^find/, function(next) {
  // use regex to match all the find queries
  this.find({ secretTour: { $ne: true } }) // hide the secret tour from clients
  this.start = Date.now()
  next()
})

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt' // - means 'exclude'
  })
  next()
})

tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`)
  next()
})

// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function(next) {
  // update the pipeline we passed in Tour.aggregate([])
  const firstInPipeline = this.pipeline()[0] //check firstInPipeline
  if (firstInPipeline.hasOwnProperty('$geoNear')) {
    //don't match secret tours, but splice "$match" stage after $geoNear in pipeline
    this.pipeline().splice(1, 0, {
      $match: { secretTour: { $ne: true } }
    })
    return next()
  }
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }) // insert new elements at the start of an array
  // print out the pipeline after the $match insertion
  console.log(this.pipeline())
  next()
})

// build a Tour model based on Mongoose schema
// this will help automatically create a "tours" collection in MongoDB
const Tour = mongoose.model('Tour', tourSchema)

module.exports = Tour

const mongoose = require('mongoose')
const Tour = require('./tourModel')

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    // when we have a virtual property (a field that's not stored in the db, but calculated by other values)
    // we would like to have it show up whenever there's an output
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// ensure the tour+user combo is always unique
// if the same user post new review on the same tour, a "duplicate key error" will be thrown
reviewSchema.index({ tour: 1, user: 1 }, { unique: true })

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo' // select name and photo
  })
  next()
})

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  // 'this' refers to the review document
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ])

  if (stats.length > 0) {
    // update the tour's ratingsQuantity and ratingAverage with the latest rating
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      raingsAverage: stats[0].avgRating
    })
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      raingsAverage: 4.5 //default rating
    })
  }
}

// the post middleware does not get access to next
reviewSchema.post('save', function() {
  // the constructor is the model that creates the document
  this.constructor.calcAverageRatings(this.tour)
})

// define a post middleware that matches updateReview and deleteReview, in another word findByIdAndUpdate and findByIdAndDelete
// 'findByIdAndUpdate' and 'findByIdAndDelete' are essintially 'findOneAndUpdate' and 'findOneAndDelete'
reviewSchema.post(/^findOneAnd/, async function(doc, next) {
  console.log(doc)
  await doc.constructor.calcAverageRatings(doc.tour)
  next()
})

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review

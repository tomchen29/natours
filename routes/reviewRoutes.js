const express = require('express')
const reviewController = require('./../controllers/reviewController')
const authController = require('./../controllers/authController')

// by default, each router has only access to parameters for its specific route
const router = express.Router({ mergeParams: true })

// POST /tour/234fad4/reviews
// POST /reviews

router.use(authController.protect)

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user', 'admin'),
    reviewController.setTourUserIds, // the :tourId will be passed into req because of mergeParams
    reviewController.createReview
  )

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )

module.exports = router

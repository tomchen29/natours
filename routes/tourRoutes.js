const express = require('express')
const tourController = require('./../controllers/tourController')
const authController = require('./../controllers/authController')
const reviewRouter = require('./../routes/reviewRoutes')

const router = express.Router()

// POST /tour/234fad4/reviews
// GET /tour/234fad4/reviews
router.use('/:tourId/reviews', reviewRouter)

// use middleware to modify the request as we need
router.route('/top-5-cheap').get(
  // 1st stage middleware
  tourController.aliasTopTours,
  // output middleware
  tourController.getAllTours
)

router.route('/tour-stats').get(tourController.getTourStats)
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  )

// /tours-within?distance=233.center=40,45,unit=mi
// /tours-within/400/center/34.111745,-118,113491/unit/mi
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin)

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances)

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  )

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    tourController.deleteTour
  )

module.exports = router

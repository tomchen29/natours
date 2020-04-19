const catchAsync = require('./../utils/catchAsync')
const APIFeatures = require('./../utils/apiFeatures')
const AppError = require('./../utils/appError')

exports.deleteOne = Mondel =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id)

    if (!doc) {
      return next(new AppError('No document found with that ID', 404))
    }

    // 204 means no content
    res.status(204).json({
      'status': 'success',
      'data': null
    })
  })

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //the newly updated document will be returned
      runValidators: true // validate that if the update fits the model's schema
    })

    if (!doc) {
      return next(new AppError('No document found with that ID', 404))
    }

    res.status(200).json({
      'status': 'success',
      'data': {
        // put a place holder here
        data: doc
      }
    })
  })

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body)

    res.status(201).json({
      'status': 'success',
      'data': {
        'data': doc
      }
    })
  })

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id)
    // fill up the popOptions with actual data in the return payload (realtime)
    if (popOptions) query = query.populate(popOptions)
    const doc = await query

    if (!doc) {
      return next(new AppError('No document found with that ID'), 404)
    }

    res.status(200).json({
      'status': 'success',
      'data': {
        data: doc
      }
    })
  })

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour
    // this is a hack and can be optimized later
    let filter = {}
    if (req.params.tourId) filter = { tour: req.params.tourId }

    // BUILD QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate()

    // EXECUTE QUERY
    const doc = await features.query

    res.status(200).json({
      'status': 'success',
      'results': doc.length,
      'data': {
        data: doc
      }
    })
  })

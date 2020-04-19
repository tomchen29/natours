class APIFeatures {
  // same method as def __init__() in python
  constructor(query, queryString) {
    this.query = query // query is a mongoose query object
    this.queryString = queryString // queryString is req.query
  }

  // 1) Filtering
  // 127.0.0.1:3000/api/v1/tours?duration[get]=5&difficulty=easy
  // {difficulty: 'easy', duration: {gte: 5}}
  filter() {
    const queryObj = { ...this.queryString } // hard copy req.query
    const excludedFields = ['page', 'sort', 'limit', 'fields']
    excludedFields.forEach(el => delete queryObj[el])

    // 1B) Advanced filtering
    // 127.0.0.1:3000/api/v1/tours?duration[get]=5&difficulty=easy
    // {difficulty: 'easy', duration: {gte: 5}}
    let queryStr = JSON.stringify(queryObj)
    // exact matches for either of the 4 words
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)

    this.query = this.query.find(JSON.parse(queryStr))
    return this // return the entire instance
  }

  // 2) Sorting
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ')
      this.query = this.query.sort(sortBy)
      // in Mongoose, sort('condition_A condition_B')
    } else {
      // by default, sort as descending order of create time
      this.query = this.query.sort('-createdAt')
    }
    return this
  }

  // 3) Field limiting
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ')
      this.query = this.query.select(fields)
    } else {
      // by default, exclude the version number for the response to client
      this.query = this.query.select('-__v')
    }
    return this
  }

  // 4) Pagination
  paginate() {
    const page = this.queryString.page * 1 || 1 // default value is 1
    const limit = this.queryString.limit * 1 || 100 // default value is 100
    const skip = (page - 1) * limit
    // page=2&limit=10, 1-10 in page1, 11-20 in page2, ...
    this.query = this.query.skip(skip).limit(limit)
    return this
  }
}
module.exports = APIFeatures

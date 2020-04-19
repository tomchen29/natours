module.exports = fn => {
  return (req, res, next) => {
    // catch and pass the error to the next function
    // this will make the error in the global handling middleware
    fn(req, res, next).catch(next)
  }
}

const fs = require('fs')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const Tour = require('./../../models/tourModel')
const Review = require('./../../models/reviewModel')
const User = require('./../../models/userModel')

// load the user-defined entities into process.env
// once the entities are loaded, they are available across all the modules
// modules can just called process.env to access these entities
dotenv.config({ path: `${__dirname}/../../config.env` })

// prepare for the right DB url
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
)

// connect to mongoose
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB connection successful!'))

// read json file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'))
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'))
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
)

// import data into databse
const importData = async () => {
  try {
    await User.create(users, { validateBeforeSave: false }) // need to commpent out the JWT encryption code in userModel.js!!!
    await Tour.create(tours)
    await Review.create(reviews)
    console.log('Data successfully loaded')
    process.exit()
  } catch (err) {
    console.log(err)
  }
}

// delete all data from database
const deleteData = async () => {
  try {
    // delete the whole tours collection
    await Tour.deleteMany()
    await User.deleteMany()
    await Review.deleteMany()
    console.log('Data successfully deleted')
    process.exit()
  } catch (err) {
    console.log(err)
  }
}

if (process.argv[2] === '--import') {
  importData()
} else if (process.argv[2] === '--delete') {
  deleteData()
}

console.log(process.argv)

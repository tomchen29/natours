const dotenv = require('dotenv')
const mongoose = require('mongoose')
// load the user-defined entities into process.env
// once the entities are loaded, they are available across all the modules
// modules can just called process.env to access these entities
dotenv.config({ path: './config.env' })

// early error handling: uncaught exceptions
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shuttling down...')
  console.log(err.name, err.message)
  // synchronaized code, does not need server
  process.exit(1)
})

// instantiate the app after we set up the config of dotenv
const app = require('./app')

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
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'))

// start the application with a pre-defined port
// Heroku will assign a PORT value to process.env
const port = process.env.PORT || 3000
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`)
})

// deal with unhandle rejection, such as failed DB connection
process.on('unhandledRejection', err => {
  console.log(err.name, err.message)
  console.log('UNHANDLE REJECTION! 💥 Shuttling down...')
  // give the server time to finish all the pending requests
  server.close(() => {
    process.exit(1)
  })
})

// deal with an SIGTERM event, such as Heruku shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully...')
  server.close(() => {
    console.log('💥 Process terminated!')
  })
  // the SIGTERM will automatically shut down the service, so we don't need process.exit(1)
})

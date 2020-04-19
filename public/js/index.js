/* eslint-disable */

'@doc \
This file handles everything that is related to client-side event!'

import '@babel/polyfill'
import { displayMap } from './mapbox'
import { login, logout, signup } from './login' // save the 'login' module to login variable
import { updateSettings } from './updateSettings'
import { bookTour } from './stripe'

// DOM ELEMENTS
const mapBox = document.getElementById('map')
const loginForm = document.querySelector('.form--login') // the first element in the document with the class ".form--login" is returned
const logOutBtn = document.querySelector('.nav__el--logout')
const signupForm = document.querySelector('.form--signup')
const userDataForm = document.querySelector('.form-user-data')
const userPasswordForm = document.querySelector('.form-user-password')
const inputForm = document.querySelector('.form__upload')
const bookBtn = document.getElementById('book-tour')

// DELEGATION
if (mapBox) {
  // we specify the 'data-location' tag for map div, whose data will be stored in dataset.locations
  const locations = JSON.parse(mapBox.dataset.location)
  displayMap(locations)
}

if (signupForm) {
  signupForm.addEventListener('submit', e => {
    e.preventDefault() //prevents the event from loading any page
    const name = document.getElementById('name').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const passwordConfirm = document.getElementById('passwordConfirm').value
    signup(name, email, password, passwordConfirm)
  })
}

if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault() //prevents the event from loading any page
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    login(email, password)
  })
}

if (logOutBtn) logOutBtn.addEventListener('click', logout)

if (userDataForm)
  userDataForm.addEventListener('submit', e => {
    e.preventDefault()
    const form = new FormData() // standard web JS library
    form.append('name', document.getElementById('name').value)
    form.append('email', document.getElementById('email').value)
    form.append('photo', document.getElementById('photo').files[0])
    updateSettings(form, 'data')
  })

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async e => {
    e.preventDefault()

    const passwordCurrent = document.getElementById('password-current').value
    const password = document.getElementById('password').value
    const passwordConfirm = document.getElementById('password-confirm').value

    // change the HTML text to 'Updating...' to get users some idea of the progress
    document.querySelector('.btn--save-password').textContent = 'Updating...'
    // await for server to update the password
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    )

    // reset the input in the form when done
    document.querySelector('.btn--save-password').textContent = 'SAVE PASSWORD'
    document.getElementById('password-current').value = ''
    document.getElementById('password').value = ''
    document.getElementById('password-confirm').value = ''
  })

if (inputForm) {
  inputForm.addEventListener('change', () => {
    const file = document.getElementById('photo').files[0]
    const reader = new FileReader()

    reader.onload = e => {
      document.querySelector('.form__user-photo').src = e.target.result
    }

    reader.readAsDataURL(file)
  })
}

if (bookBtn) {
  bookBtn.addEventListener('click', e => {
    // target here refers to the element that gets clicked
    e.target.textContent = 'Processing...'
    // the metadata 'data-tour-id' will be converted into tourId in dataset dict
    bookTour(e.target.dataset.tourId)
  })
}

/* eslint-disable */
import axios from 'axios'
import { showAlert } from './alerts'

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email: email,
        password: password
      }
    })

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!')
      // redirect to home page!
      window.setTimeout(() => {
        location.assign('/')
      }, 1500)
    }
  } catch (err) {
    showAlert('error', err.response.data.message)
  }
}

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout'
    })
    if ((res.data.status = 'success')) location.reload(true) // force a reload from the server instead of browser cache
  } catch (err) {
    showAlert('error', 'Error logging out! Try again.')
  }
}

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm,
        role: 'user'
      }
    })

    if (res.data.status === 'success') {
      showAlert('success', 'Sign up successfully!')

      window.setTimeout(async () => {
        // log in with the newly created account
        await login(email, password)
        // redirect to home page!
        location.assign('/')
      }, 1500)
    }
  } catch (err) {
    showAlert('error', err.response.data.message)
  }
}

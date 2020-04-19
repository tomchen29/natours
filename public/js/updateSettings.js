/* eslint-disable */
import axios from 'axios'
import { showAlert } from './alerts'

export const updateSettings = async (data, type) => {
  /* type is either 'password' or 'data' */
  // use axios to create API call
  try {
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe'

    const res = await axios({
      method: 'PATCH',
      url,
      data
    })

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully`)
      // once success, refresh the page
      window.setTimeout(() => {
        location.reload()
      }, 1000)
    }
  } catch (err) {
    // show error msg responded by Nodejs server
    showAlert('error', err.response.data.message)
  }
}

/* eslint-disable */

export const hideAlert = () => {
  const el = document.querySelector('.alert')
  if (el) el.parentElement.removeChild(el)
}

// type is either 'success' or 'error'
export const showAlert = (type, msg) => {
  hideAlert() // remove the pre-defined alert info
  const markup = `<div class="alert alert--${type}">${msg}</div>`
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup) // insert the new self-defined alert msg in DOM
  window.setTimeout(hideAlert, 5000) // hide alert after 5s
}

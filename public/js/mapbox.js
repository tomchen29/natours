/* eslint-disable */

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoidG9tY2hlbjI5IiwiYSI6ImNrN2sxNnlvZzB6NHkza2xwYjdndW90dm4ifQ.rIFrVWY5aTMNz4yVlYlVBA'

  // instantiate mapboxgl, and put the map on the HTML element with id="map"
  var map = new mapboxgl.Map({
    container: 'map', // put the map on the HTML element with id="map"
    style: 'mapbox://styles/mapbox/streets-v11',
    interactive: true,
    scrollZoom: false
  })

  // we've included the js script to import mapbox-gl.js at the beginning of tour.pug
  const bounds = new mapboxgl.LngLatBounds()

  locations.forEach(loc => {
    //Create marker with standard JS code
    const el = document.createElement('div')
    el.className = 'marker' //marker has been defined in style.css with a background pin image

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom' // the bottom of the pin will be located at the exact GPS location
    })
      .setLngLat(loc.coordinates)
      .addTo(map)

    // Add popup
    new mapboxgl.Popup({
      offset: 30 // offset 30 pixels
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map)

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates)
  })

  // zoom the map to the optimal level that just includes all the marked locations
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  })
}

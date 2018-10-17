require('isomorphic-fetch');
const magic = require('magic-promises');

// To avoid making parallel requests to the same url if one is ongoing
const ongoing = {};

export default (url, options = {}) => {
  if (typeof options.method === 'undefined') {
    options.method = 'get';
  }

  if (typeof options.credentials === 'undefined') {
    options.credentials = 'include';
  }

  if (options.method.toLowerCase() === 'get') {
    if (ongoing[url]) return ongoing[url];
  }

  ongoing[url] = magic(fetch(url, options).then(res => {
    // No longer ongoing at this point
    delete ongoing[url];

    // Everything is good, just keep going
    if (res.ok) return res;

    // Oops, throw it
    const error = new Error(res.statusText || res.status);
    error.response = res;
    return Promise.reject(error);
  }));

  return ongoing[url];
};

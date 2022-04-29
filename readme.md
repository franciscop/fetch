# Fch [![npm install fch](https://img.shields.io/badge/npm%20install-fch-blue.svg)](https://www.npmjs.com/package/fch) [![gzip size](https://img.badgesize.io/franciscop/fetch/master/index.js.svg?compression=gzip)](https://github.com/franciscop/fetch/blob/master/index.js)

A tiny library to make API calls easier. Similar to Axios, but tiny size and simpler API:

```js
import api from "fch";
api.baseUrl = "https://pokeapi.co/";
const mew = await api.get("/pokemon/150");
console.log(mew);
```

- Create instances with shared options across requests.
- Automatically encode object and array bodies as JSON.
- Automatically decode JSON responses based on the headers.
- Await/Async Promises; `>= 400 and <= 100` will _reject_ with an error.
- Interceptors: `before` the request, `after` the response and catch with `error`.
- Deduplicates parallel GET requests.
- Works the same way in Node.js and the browser.
- No dependencies; include it with a simple `<script>` on the browser.

```js
import api from 'fch';

api.get(url, { headers, ...options })
api.head(url, { headers, ...options })
api.post(url, { body, headers, ...options })
api.patch(url, { body, headers, ...options })
api.put(url, { body, headers, ...options })
api.del(url, { body, headers, ...options })

api.create({ url, body, headers, ...options})
```

| Options               | Default   | Description                        |
| ----------------------| ----------| -----------------------------------|
| [`method`](#method)   | `"get"`   | Default method to use for the call |
| [`url`](#url)         | `null`    | The path or url for the request    |
| [`baseUrl`](#url)     | `null`    | The shared base of the API         |
| [`body`](#body)       | `null`    | The body to send with the request  |
| [`query`](#query)     | `{}`      | Add query parameters to the URL    |
| [`headers`](#headers) | `{}`      | Shared headers across all requests |
| [`output`](#output)   | `"body"`  | The return value of the API call   |
| [`dedupe`](#dedupe)   | `true`    | Reuse concurrently GET requests    |
| [`before`](#interceptors) |`req => req`       |Process the request before sending it    |
| [`after`](#interceptors)  |`res => res`       |Process the response before returning it |
| [`error`](#interceptors)  |`err => throw err` |Process errors before returning them     |

## Getting Started

Install it in your project:

```bash
npm install fch
```

Then import it to be able to use it in your code:

```js
import fch from 'fch';
const body = await fch.get('/');
```

On the browser you can add it with a script and it will be available as `fch`:

```html
<!-- Import it as usual -->
<script src="https://cdn.jsdelivr.net/npm/fch"></script>
<script>
  fch('/hello');
</script>
```

## Options

These are all available options and their defaults:

```js
import api from 'fch';

// General options with their defaults; all of these are also parameters:
api.method = 'get';  // Default method to use for api()
api.url = '/';       // Relative or absolute url where the request is sent
api.baseUrl = null;  // Set an API base URL reused all across requests
api.query = {};      // Merged with the query parameters passed manually
api.headers = {};    // Merged with the headers on a per-request basis

// Control simple variables
api.output = 'body'; // Return the body; use 'response' for the full response
api.dedupe = true;   // Avoid sending concurrent GET requests to the same path

// Interceptors
api.before = req => req;
api.after = res => res;
api.error = err => Promise.reject(err);
```

They can all be defined globally as shown above, passed manually as the options argument, or be used when [creating a new instance](#create-an-instance).

### Method

The HTTP method to make the request. When using the shorthand, it defaults to `GET`. We recommend using the method syntax:

```js
import api from 'fch';

api.get('/cats');
api.post('/cats', { body: { name: 'snowball' } });
api.put(`/cats/3`, { body: { name: 'snowball' }});
```

You can use it with the plain function as an option parameter. The methods are all lowercase but the option as a parameter is case insensitive; it can be either uppercase or lowercase:

```js
// Recommended way of dealing with methods:
api.get(...);

// INVALID; won't work
api.GET(...);

// Both of these are valid:
api({ method; 'GET' })
api({ method; 'get'})
```

Example: adding a new cat and fixing a typo:

```js
import api from 'fch';

const cats = await api.get('/cats');
console.log(cats);
const { id } = await api.post('/cats', { body: { name: 'snowbll' } });
await api.put(`/cats/${id}`, { body: { name: 'snowball' }})
```

### Url

Specify where to send the request to. It's normally the first argument, though technically you can use both styles:

```js
import api from 'fch';

// Recommended way of specifying the Url
await api.post('/hello', { body: '...', headers: {} })

// These are also valid if you prefer their style; we won't judge
await api('/hello', { method: 'post', body: '...', headers: {} });
await api({ url: '/hello', method: 'post', headers: {}, body: '...' });
await api.post({ url: '/hello', headers: {}, body: '...' });
```

It can be either absolute or relative, in which case it'll use the local one in the page. It's recommending to set `baseUrl`:

```js
import api from 'fch';
api.baseUrl = 'https//api.filemon.io/';
api.get('/hello');
// Called https//api.filemon.io/hello
```

> Note: with Node.js you need to either set an absolute baseUrl or make the URL absolute

### Body

The `body` can be a string, a plain object|array or a FormData instance. If it's an array or object, it'll be stringified and the header `application/json` will be added. Otherwise it'll be sent as plain text:

```js
import api from 'api';

// Sending plain text
await api.post('/houses', { body: 'plain text' });

// Will JSON.stringify it internally, and add the JSON headers
await api.post('/houses', { body: { id: 1, name: 'Cute Cottage' } });

// Send it as FormData
form.onsubmit = e => {
  await api.post('/houses', { body: new FormData(e.target) });
};
```

The methods `GET` and `HEAD` do not accept a body and it'll be ignored.

The **response body** will be returned by default as the output of the call:

```js
const body = await api.get('/cats');
console.log(body);
// [{ id: 1, }, ...]
```

When the server specifies the header `Content-Type` as `application/json`, then we'll attempt to parse the response body and return that as the variable. Otherwise, the plain text will be returned.

When the function returns the response (if you set `output: "response"` as an option), then the body can be accessed as `response.body`:

```js
const response = await api.get('/cats', { output: 'response' });
console.log(response.body);
// [{ id: 1, }, ...]
```


### Query

You can easily pass GET query parameters by using the option `query`:

```js
api.get('/cats', { query: { limit: 3 } });
// /cats?limit=3
```

While rare, some times you might want to persist a query parameter across requests and always include it; in that case, you can define it globally and it'll be added to every request:

```js
import api from 'fch';
api.query.myparam = 'abc';

api.get('/cats', { query: { limit: 3 } });
// /cats?limit=3&myparam=abc
```


### Headers

You can define headers globally, in which case they'll be added to every request, or locally, so that they are only added to the current request. You can also add them in the `before` callback:


```js
import api from 'fch';

// Globally, so they are reused across all requests
api.headers.a = 'b';

// With an interceptor, in case you need dynamic headers per-request
api.before = req => {
  req.headers.c = 'd';
  return req;
};

// Set them for this single request:
api.get('/hello', { headers: { e: 'f' } });
// Total headers on the request:
// { a: 'b', c: 'd', e: 'f' }
```

When to use each?

- If you need headers shared across all requests, like an API key, then the global one is the best place.
- When you need to extract them dynamically from somewhere it's better to use the .before() interceptor. An example would be the user Authorization token.
- When it changes on each request, it's not consistent or it's an one-off, use the option argument.


### Output

This controls whether the call returns just the body (default), or the whole response. It can be controlled globally or on a per-request basis:

```js
import api from 'fch';

// "body" (default) or "response"
api.output = 'body';

// Return only the body, this is the default
const body = await api.get('/data');

// Return the whole response (with .body):
const response = await api.get('/data', { output: 'response' });

// Throws error
const invalid = await api.get('/data', { output: 'invalid' });
```


### Dedupe

When you perform a GET request to a given URL, but another GET request *to the same* URL is ongoing, it'll **not** create a new request and instead reuse the response when the first one is finished:

```js
fetch.mockOnce("a").mockOnce("b");
const res = await Promise.all([fch("/a"), fch("/a")]);

// Reuses the first response if two are launched in parallel
expect(res).toEqual(["a", "a"]);
```

You can disable this by setting either the global `fch.dedupe` option to `false` or by passing an option per request:

```js
// Globally set it for all calls
fch.dedupe = true;  // [DEFAULT] Dedupes GET requests
fch.dedupe = false; // All fetch() calls trigger a network call

// Set it on a per-call basis
fch('/a', { dedupe: true });  // [DEFAULT] Dedupes GET requests
fch('/a', { dedupe: false })  // All fetch() calls trigger a network call
```

> We do not support deduping other methods besides `GET` right now

Note that opting out of deduping a request will _also_ make that request not be reusable, see this test for details:

```js
it("can opt out locally", async () => {
  fetch.once("a").once("b").once("c");
  const res = await Promise.all([
    fch("/a"),
    fch("/a", { dedupe: false }),
    fch("/a"),  // Reuses the 1st response, not the 2nd one
  ]);

  expect(res).toEqual(["a", "b", "a"]);
  expect(fetch.mock.calls.length).toEqual(2);
});
```

### Interceptors

You can also easily add the interceptors `before`, `after` and `error`:

```js
// Perform an action or request transformation before the request is sent
fch.before = async req => {
  // Normalized request ready to be sent
  ...
  return req;
};

// Perform an action or data transformation after the request is finished
fch.after = async res => {
  // Full response as just after the request is made
  ...
  return res;
};

// Perform an action or data transformation when an error is thrown
fch.error = async err => {
  // Need to re-throw if we want to throw on error
  ...
  throw err;

  // OR, resolve it as if it didn't fail
  return err.response;

  // OR, resolve it with a custom value
  return { message: 'Request failed with a code ' + err.response.status };
};
```


## How to

### Stop errors from throwing

While you can handle this on a per-request basis, if you want to overwrite the global behavior you can write a interceptor:

```js
import fch from 'fch';
fch.error = error => error.response;

const res = await fch('/notfound');
expect(res.status).toBe(404);
```

### Return the full response

By default a successful request will just return the data. However this one is configurable on a global level:

```js
import fch from 'fch';
fch.output = 'response';  // Valid values are 'body' (default) or 'response'

const res = await fch('/hello');
```

Or on a per-request level:

```js
import fch from 'fch';

// Valid values are 'body' (default) or 'response'
const res = await fch('/hello', { output: 'response' });

// Does not affect others
const body = await fch('/hello');
```


### Set a base URL

There's a configuration parameter for that:

```js
import fch from 'fch';
fch.baseUrl = 'https://api.filemon.io/';

// Calls "https://api.filemon.io/blabla"
const body = await fch.get('/blabla');
```


### Set authorization headers

You can set that globally as a header:

```js
import fch from 'fch';
fch.headers.Authorization = 'bearer abc';

const me = await fch('/users/me');
```

Or globally on a per-request basis, for example if you take the value from localStorage:

```js
import fch from 'fch';

// All the requests will add the Authorization header when the token is
// in localStorage
fch.before = req => {
  if (localStorage.get('token')) {
    req.headers.Authorization = 'bearer ' + localStorage.get('token');
  }
  return req;
};

const me = await fch('/users/me');
```

Or on a per-request basis, though we wouldn't recommend this:

```js
import fch from 'fch';

const me = await fch('/users/me', { headers: { Authorization: 'bearer abc' } });
```


### Create an instance

You can create an instance with its own defaults and global options easily. It's common when writing an API that you want to encapsulate away:

```js
import fch from 'fch';

const api = fch.create({
  baseUrl: 'https://api.filemon.io/',
  ...
});

api.get('/hello');   // Gets https://api.filemon.io/hello
fch.get('/hello');   // Gets http://localhost:3000/hello (or wherever you are)
```

Note: for server-side (Node.js) usage, you always want to set `baseUrl`.



### Cancel ongoing requests

You can cancel ongoing requests [similarly to native fetch()](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort#examples), by passing it a signal:

```js
import api from 'fch';

const controller = new AbortController();
const signal = controller.signal;

abortButton.addEventListener('click', () => {
  controller.abort();
  console.log('Download aborted');
});

api.get(url, { signal });
```



### Define shared options

You can also define values straight away:

```js
import api from "fch";

api.baseUrl = "https://pokeapi.co/";

const mew = await api.get("/pokemon/150");
console.log(mew);
```

You can also [create an instance](#create-an-instance) that will have the same options for all requests made with that instance.



### Node.js vs Browser

First, we use the native Node.js' fetch() and the browser's native fetch(), so any difference between those also applies to this library. For example, if you were to call `"/"` in the browser it'd refer to the current URL, while in Node.js it'd fail since you need to specify the full URL. Some other places where you might find differences: CORS, cache, etc.

In the library itself there's nothing different between the browser and Node.js, but it might be interesting to note that (if/when implemented) things like cache, etc. in Node.js are normally long-lived and shared, while in a browser request it'd bound to the request itself.



### Differences with Axios

The main difference is that things are simplified with fch:

```js
// Modify headers
axios.defaults.headers.Authorization = '...';
fch.headers.Authorization = '...';

// Set a base URL
axios.defaults.baseURL = '...';
fch.baseUrl = '...';

// Add an interceptor
axios.interceptors.request.use(fn);
fch.before = fn;
```

API size is also strikingly different, with **7.8kb** for Axios and **1.9kb** for fch.

As disadvantages, I can think of two major ones for `fch`:

- Requires Node.js 18+, which is the version that includes `fetch()` by default.
- Does not support many of the more advanced options, like `onUploadProgress` nor `onDownloadProgress`.

# Fch [![npm install fch](https://img.shields.io/badge/npm%20install-fch-blue.svg)](https://www.npmjs.com/package/fch) [![gzip size](https://img.badgesize.io/franciscop/fetch/master/fetch.js.svg?compression=gzip)](https://github.com/franciscop/fetch/blob/master/fetch.js)

A library to make API calls easier. Similar to Axios, but tiny size and simpler API:

```js
import api from "fch";
const mew = await api("https://pokeapi.co/pokemon/150");
console.log(mew);
```

- Automatically `JSON.stringify()` and `Content-Type: 'application/json'` for objects.
- Automatically parse server response taking into account the headers.
- Works the same way in Node.js and the browser.
- Await/Async Promise interface works as you know and love.
- Better error handling. `>= 400 and <= 100` will _reject_ the promise with an error instance.
- Advanced [Promise interface](https://www.npmjs.com/swear) for better scripting.
- Easily define shared options straight on the root `fetch.baseUrl = "https://...";`.
- Interceptors: `before` (the request), `after` (the response) and `error` (it fails).
- Deduplicates parallel GET requests.
- Configurable to return either just the body, or the full response.

These are the available options and their defaults:

| Methods                              | Description                           |
|--------------------------------------|---------------------------------------|
|`api(url, { method, body, headers })` | Generic fetch-like function           |
|`api.get(url, { headers })`           | Make GET requests (no body)           |
|`api.head(url, { headers })`          | Make HEAD requests (no body)          |
|`api.post(url, { body, headers })`    | Make POST requests                    |
|`api.patch(url, { body, headers })`   | Make PATCH requests                   |
|`api.put(url, { body, headers })`     | Make PUT requests                     |
|`api.del(url, { body, headers })`     | Make DELETE requests                  |

|Options/variables |Default        |Description                                |
|------------------|---------------|-------------------------------------------|
|`url`             |`null`         |The path or full url for the request       |
|`api.baseUrl`     |`null`         |The shared base of the API                 |
|`api.method`      |`"get"`        |Default method to use for the call         |
|`api.headers`     |`{}`           |Shared headers across all requests         |
|`api.dedupe`      |`true`         |Reuse GET requests made concurrently       |
|`api.output`      |`"body"`       |The return value of the API call           |
|`api.before`      |`req => req`   |Process the request before sending it      |
|`api.after`       |`res => res`   |Process the response before receiving it   |
|`api.error`       |`err => reject(err)` |Process errors before returning them |

## Getting Started

Install it in your project:

```bash
npm install fch
```

Then import it to be able to use it in your code:

```js
import api from 'fch';
const body = await api.get('/');
```

## Options

```js
import api, { get, post, put, ... } from 'fch';

// General options with their defaults; most of these are also parameters:
api.baseUrl = null;  // Set an API endpoint
api.method = 'get';  // Default method to use for api()
api.headers = {};    // Is merged with the headers on a per-request basis

// Control simple variables
api.dedupe = true;   // Avoid parallel GET requests to the same path
api.output = 'body'; // Return the body; use 'response' for the full response

// Interceptors
api.before = req => req;
api.after = res => res;
api.error = err => Promise.reject(err);

// Similar API to fetch()
api(url, { method, body, headers, ... });

// Our highly recommended style:
api.get(url, { headers, ... });
api.post(url, { body, headers, ... });
api.put(url, { body, headers, ... });
// ...

// Just import/use the method you need
get(url, { headers, ... });
post(url, { body, headers, ... });
put(url, { body, headers, ... });
// ...
```

### URL

This is normally the first argument, though technically you can use both styles:

```js
// All of these methods are valid
import api from 'fch';

// We strongly recommend using this style for your normal code:
await api.post('/hello', { body: '...', headers: {} })

// Try to avoid these, but they are also valid:
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

### Body

The `body` can be a string, a FormData instance or a plain object. If it's an object, it'll be stringified and the header `application/json` will be added. Otherwise it'll be sent as plain text:

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


### Headers

You can define headers globally, in which case they'll be added to every request, or locally, so that they are only added to the current request. You can also add them in the `before` callback:


```js
import api from 'fch';
api.headers.abc = 'def';

api.get('/helle', { headers: { ghi: 'jkl' } });
// Total headers on the request:
// { abc: 'def', ghi: 'jkl' }
```


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

> We do not support deduping other methods right now besides `GET` right now

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



### Advanced promise interface

This library uses [the `swear` promise interface](https://www.npmjs.com/swear), which allows you to query operations seamlessly on top of your promise:

```js
import api from "fch";

// You can keep performing actions like it was sync
const firstFriendName = await api.get("/friends")[0].name;
console.log(firstFriendName);
```

### Define shared options

You can also define values straight away:

```js
import api from "fch";

api.baseUrl = "https://pokeapi.co/";

const mew = await api.get("/pokemon/150");
console.log(mew);
```

If you prefer Axios' style of outputting the whole response, you can do:

```js
// Default, already only returns the data on a successful call
api.output = "data";
const name = await api.get("/users/1").name;

// Axios-like
api.output = "response";
const name = await api.get("/users/1").data.name;
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


### Set the authorization headers

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

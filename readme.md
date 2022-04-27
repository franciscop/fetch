# Fch [![npm install fch](https://img.shields.io/badge/npm%20install-fch-blue.svg)](https://www.npmjs.com/package/fch) [![gzip size](https://img.badgesize.io/franciscop/fetch/master/fetch.js.svg?compression=gzip)](https://github.com/franciscop/fetch/blob/master/fetch.js)

A library to make API calls easier. Similar to Axios, but tiny size and simpler API:

```js
import api from "fch";

api.baseUrl = "https://pokeapi.co/";

const mew = await api("/pokemon/150");
console.log(mew);
```

`fch` is a better `fetch()`:

- Automatically `JSON.stringify()` and `Content-Type: 'application/json'` for plain objects.
- Automatically parse server response as json if it includes the headers, or text otherwise.
- Isomorphic fetch(); it works the same way in the browser and server.
- Await/Async Promise interface works as you know and love.
- Better error handling. `>= 400 and <= 100` will _reject_ the promise with an error instance.
- Advanced [Promise interface](https://www.npmjs.com/swear) for better scripting.
- Import with the shorthand for tighter syntax. `import { get, post } from 'fch';`.
- Easily define shared options straight on the root `fetch.baseUrl = "https://...";`.
- Interceptors: `before` (the request), `after` (the response) and `error` (it fails).
- Deduplicates parallel GET requests.
- Configurable to return either just the body, or the full response.
- [TODO]: cache engine with "highs" and "lows", great for scrapping
- [TODO]: rate-limiting of requests (N-second, or N-parallel), great for scrapping

## Getting Started

Install it in your project:

```bash
npm install fch
```

Then import it to be able to use it in your code:

```js
import api from 'fch';

const data = await api.get('/');
```


### Advanced promise interface

This library has a couple of aces up its sleeve. First, it [has a better Promise interface](https://www.npmjs.com/swear):

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


## Dedupe

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


## How to

### Stop errors from throwing

While you can handle this on a per-request basis, if you want to overwrite the global behavior you can just do:

```js
import fch from 'fch';
fch.error = error => error.response;

const res = fch('/notfound');
expect(res.status).toBe(404);
```

Just that, then when there's an error it'll just return as usual, e.g.:

```js
import fch from 'fch';
fch.error = error => error.response;

const res = fch('/notfound');
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

// Calls "https://api.filemon.io/blabla/"
const body = await fch.get('/blabla/');
```


### Set the authorization headers

You can set that globally as a header:

```js
import fch from 'fch';
fch.headers.Authorization = 'bearer abc';

const me = await fch('/users/me');
```

Globally on a per-request basis, for example if you take the value from localStorage:

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

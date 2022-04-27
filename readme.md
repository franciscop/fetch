# Fch [![npm install fch](https://img.shields.io/badge/npm%20install-fch-blue.svg)](https://www.npmjs.com/package/fch) [![gzip size](https://img.badgesize.io/franciscop/fetch/master/fetch.min.js.svg?compression=gzip)](https://github.com/franciscop/fetch/blob/master/fetch.min.js)

A tiny library to make API calls a breeze. It's similar to Axios, and works in Node.js (18+) and the browser:

```js
import api from "fch";

api.baseUrl = "https://pokeapi.co/";

const mew = await api.get("/pokemon/150");
console.log(mew);
```

`fch` is a better `fetch()`:

- Isomorphic fetch(); it works the same way in the browser and server.
- Automatic `JSON.stringify()` and `Content-Type: 'application/json'` for plain objects.
- Await/Async Promise interface works as you know and love.
- Better error handling. `>= 400 and <= 100` will _reject_ the promise with an error instance. Can be caught as normal with `.catch()` or `try {} catch (error) {}`.
- Advanced [Promise interface](https://www.npmjs.com/swear) so you can concatenate operations easily.
- Import with the shorthand for tighter syntax. `import { get, post } from 'fch';`.
- Easily define shared options straight on the root `fetch.baseUrl = "https://...";`.
- Great Interceptors as you know and love from Axios.

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

You can also easily add interceptors:

```js
// Perform an action or request transformation before the request is sent
api.before(async req => {
  // Normalized request ready to be sent
  ...
  return req;
});

// Perform an action or data transformation after the request is finished
api.after(async res => {
  // Full response as just after the request is made
  ...
  return res;
});
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

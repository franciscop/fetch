# Fetch [![npm install fch](https://img.shields.io/badge/npm%20install-fch-blue.svg)](https://www.npmjs.com/package/fch) [![gzip size](https://img.badgesize.io/franciscop/fetch/master/store.min.js.svg?compression=gzip)](https://github.com/franciscop/fetch/blob/master/fetch.min.js)

`fetch()` greatly improved:

```js
import { get } from 'fch';
// Example; { "name": "Francisco" }
const url = 'https://api.jsonbin.io/b/5bc69ae7716f9364f8c58651';

(async () => {
  // Using magic-promises interface
  const name = await get(url).json().name;
  console.log(name);  // "Francisco"

  // Using plain-old promises
  const data = await get(url).then(res => res.json());
  console.log(data);  // { name: "Francisco" }
})();
```



## Better `fetch()`

- Isomorphic fetch() so it works the same in the server as the browser.
- Automatic `JSON.stringify()` and `Content-Type: 'application/json'` for plain objects.
- Await/Async Promise interface works as you know and love.
- Better error handling. `>= 400 and <= 100` will _reject_ the promise with an error instance. Can be caught as normal with `.catch()` or `try {} catch (error) {}`.
- Advanced [magic-promises interface](https://github.com/franciscop/magic-promises) so you can concatenate operations easily.
- Import with the shorthand for tighter syntax. `import { get, post } from 'fch';`.


## Getting started

Install it in your project:

```
npm install atocha
```

Import it to be able to use it in your code:

```js
const cmd = require('atocha');  // Old school
import cmd from 'atocha';       // New wave
```



## Examples

Posting some data as JSON and reading the JSON response:

```js
// With this library fetch
import { post } from 'fch';
const data = await post('/url', { body: { a: 'b' } }).json();
console.log(data);
```

```js
// Native example, much longer and cumbersome:
const res = await fetch('/url', {
  method: 'POST',
  body: JSON.stringify({ a: 'b' }),
  headers: { 'content-type': 'application/json; charset=utf-8' }
});
if (!res.ok) throw new Error(res.statusText);
const data = await res.json();
console.log(data);
```

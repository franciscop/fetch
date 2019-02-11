# Fetch [![npm install fch](https://img.shields.io/badge/npm%20install-fch-blue.svg)](https://www.npmjs.com/package/fch) [![gzip size](https://img.badgesize.io/franciscop/fetch/master/fetch.min.js.svg?compression=gzip)](https://github.com/franciscop/fetch/blob/master/fetch.min.js)

`fetch()` greatly improved:

```js
import fch from 'fch';

// Example data: { "name": "Francisco" }
const url = 'https://api.jsonbin.io/b/5bc69ae7716f9364f8c58651';

(async () => {
  // Using the Swear interface
  const name = await fch(url).json().name;
  console.log(name);  // "Francisco"

  // Using plain-old promises
  const data = await fch(url).then(res => res.json());
  console.log(data.name);  // "Francisco"
})();
```



## Better `fetch()`

- Isomorphic fetch() so it works the same in the server as the browser.
- Automatic `JSON.stringify()` and `Content-Type: 'application/json'` for plain objects.
- Await/Async Promise interface works as you know and love.
- Better error handling. `>= 400 and <= 100` will _reject_ the promise with an error instance. Can be caught as normal with `.catch()` or `try {} catch (error) {}`.
- Advanced [promises interface](https://github.com/franciscop/swear) so you can chain operations easily.
- Import with the shorthand for tighter syntax. `import { get, post } from 'fch';`.


## Getting started

Install it in your project:

```
npm install fch
```

Then import it to be able to use it in your code:

```js
const { get, post, ... } = require('fch');  // Old school
import fch, { get, post, ... } from 'fch';       // New wave
```

Alternatively, include it straight from the CDN for front-end:

```html
<script src="https://cdn.jsdelivr.net/npm/fch"></script>
<script>
  const { get, post, ... } = fch;
</script>
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

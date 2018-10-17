# Fetch [![npm install fch](https://img.shields.io/badge/npm%20install-fch-blue.svg)](https://www.npmjs.com/package/fch)

Awesome fetch() improvements.

```js
import fetch from 'fch';

const url = 'https//api.jsonbin.io/b/5bc69ae7716f9364f8c58651';
const name = await fetch(url).json().name;
```

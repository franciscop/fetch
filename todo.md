# Laundry List of API requirements

All of the basic features:

- Many features, but still small at 5kb! (axios is 12kb)
- Basics: follow redirects, encode/parse JSON, etc.
- Cache system compatible with many providers.
- Retry mechanism. Compliant, but can also force retries.
- Concurrency mechanism to avoid saturating the server.
- Interceptors to modify the request/response.

```js
import MakeApi from 'make-api';

// Your normal everyday React App:
const api = MakeApi({
  url: 'https://api.example.com/',    // The base url where requests are sent
  cache: '60s',                       // Keep requests in cache for 1 minute
  before: (req) => {                  // Intercept the request URL
    if (localStorage.token) {
      req.headers.Authorization = "bearer " + localStorage.token;
    }
    return req;
  }
});
const books = await api.get('/books');
await api.post('/books', { name: 'Book of enchantments', author: '...' });

// Your Node.js/Bun crawler:
const api = MakeApi({
  cache: {
    store: redisClient,    // Use the default `redis` for storage
    expire: '1day'         // 1 week of cache per successful url
  },
  retry: 5,                // Number of times to retry each url
  concurrency: 10,         // Max 10 requests at the same time
  error: logError          // Log errors instead of thowing them
});
const thousandUrls = [...];
const res = await Promise.all(thousandUrls.map(url => api.get(url)));
```

## Comparison

Make API has all of the feautres of

- https://github.com/sindresorhus/ky
- https://github.com/elbywan/wretch

Axios plugins:

- https://www.npmjs.com/package/axios-cancel
- https://github.com/softonic/axios-retry

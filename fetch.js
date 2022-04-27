import swear from "swear";

// To avoid making parallel requests to the same url if one is ongoing
const ongoing = new Map();

// Plain-ish object
const hasPlainBody = (options) => {
  if (options.headers["content-type"]) return;
  if (typeof options.body !== "object") return;
  if (options.body instanceof FormData) return;
  return true;
};

const fch = (url, { dedupe, ...options } = {}) => {
  // Global dedupe OR local parameter OR default to "true". Allows for "false"
  dedupe = fch.dedupe ?? dedupe ?? true;
  options = { method: "get", headers: {}, ...options };

  if (fch.baseUrl) {
    const fullUrl = new URL(url, fch.baseUrl);
    url = fullUrl.href;
  }

  // NORMALIZE to LOWERCASE
  options.method = options.method.toLowerCase();
  // Make the headers lowercase
  for (let key in options.headers) {
    const value = options.headers[key];
    delete options.headers[key];
    options.headers[key.toLowerCase()] = value;
  }

  // GET requests should dedupe ongoing requests
  if (options.method === "get") {
    if (ongoing.get(url) && dedupe) return ongoing.get(url);
  }

  // JSON-encode plain objects
  if (hasPlainBody(options)) {
    options.body = JSON.stringify(options.body);
    options.headers["content-type"] = "application/json; charset=utf-8";
  }

  const fetchPromise = fetch(url, options).then((res) => {
    // No longer ongoing at this point
    ongoing.delete(url);

    // Everything is good, just keep going
    if (!res.ok) {
      // Oops, throw it
      const error = new Error(res.statusText);
      error.response = res;
      return Promise.reject(error);
    }

    // Automatically parse the response
    if (res.headers.get("content-type").includes("application/json")) {
      return res.json();
    } else {
      return res.text();
    }
  });

  if (!dedupe || options.method !== "get") {
    return fetchPromise;
  }

  ongoing.set(url, swear(fetchPromise));

  return ongoing.get(url);
};

fch.get = (url, options = {}) => fch(url, { ...options, method: "get" });
fch.head = (url, options = {}) => fch(url, { ...options, method: "head" });
fch.post = (url, options = {}) => fch(url, { ...options, method: "post" });
fch.patch = (url, options = {}) => fch(url, { ...options, method: "patch" });
fch.put = (url, options = {}) => fch(url, { ...options, method: "put" });
fch.del = (url, options = {}) => fch(url, { ...options, method: "delete" });

export default fch;

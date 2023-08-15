import fch from "../";

const ctrl = new AbortController();

fch.baseURL = "/hello";
fch.baseUrl = "/hello";

fch.get("/");
fch.get("/hello");
fch.get("/hello", {});
fch.get("/hello", { headers: { abc: "def" } });
fch.get("/hello", { signal: ctrl.signal });

fch.head("/");
fch.head("/hello");
fch.head("/hello", {});
fch.head("/hello", { headers: { abc: "def" } });
fch.head("/hello", { signal: ctrl.signal });

fch.post("/");
fch.post("/hello", "body");
fch.post("/hello", "body", {});
fch.post("/hello", "body", { headers: { abc: "def" } });
fch.post("/hello", "body", { signal: ctrl.signal });

fch.patch("/");
fch.patch("/hello", "body");
fch.patch("/hello", "body", {});
fch.patch("/hello", "body", { headers: { abc: "def" } });
fch.patch("/hello", "body", { signal: ctrl.signal });

fch.put("/");
fch.put("/hello", "body");
fch.put("/hello", "body", {});
fch.put("/hello", "body", { headers: { abc: "def" } });
fch.put("/hello", "body", { signal: ctrl.signal });

fch.del("/");
fch.del("/hello");
fch.del("/hello", {});
fch.del("/hello", { headers: { abc: "def" } });
fch.del("/hello", { signal: ctrl.signal });

const api = fch.create();

api.get("/");
api.get("/hello");
api.get("/hello", {});
api.get("/hello", { headers: { abc: "def" } });
api.get("/hello", { signal: ctrl.signal });

api.head("/");
api.head("/hello");
api.head("/hello", {});
api.head("/hello", { headers: { abc: "def" } });
api.head("/hello", { signal: ctrl.signal });

api.post("/");
api.post("/hello", "body");
api.post("/hello", "body", {});
api.post("/hello", "body", { headers: { abc: "def" } });
api.post("/hello", "body", { signal: ctrl.signal });

api.patch("/");
api.patch("/hello", "body");
api.patch("/hello", "body", {});
api.patch("/hello", "body", { headers: { abc: "def" } });
api.patch("/hello", "body", { signal: ctrl.signal });

api.put("/");
api.put("/hello", "body");
api.put("/hello", "body", {});
api.put("/hello", "body", { headers: { abc: "def" } });
api.put("/hello", "body", { signal: ctrl.signal });

api.del("/");
api.del("/hello");
api.del("/hello", {});
api.del("/hello", { headers: { abc: "def" } });
api.del("/hello", { signal: ctrl.signal });

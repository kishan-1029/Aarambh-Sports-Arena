# Aarambh API — one ordered Postman run

Import both files:

- `Aarambh-API.postman_collection.json` (254 requests)
- `Aarambh-Local.postman_environment.json`

Set `adminEmail` and `adminPassword` in the environment. `baseUrl` defaults to `http://localhost:7002`.

In Postman: turn cookie saving on, select the environment, open the collection, and run the folder **01 Ordered run** from top to bottom. Leave delay at 0–200 ms. Do not enable parallel requests. Do not stop the run on a failed test if you want the rest of the list to execute.

Each run stamps a new `runId` and its own phones, names, and court slots. Later requests read ids saved by earlier tests. Logout is the last step.

Folder **02 Manual** stays skipped unless the collection variable `includeManual` is `true`. That folder sends real email, resets passwords, expires every due membership, and can replace the admin session.

Regenerate after route changes:

```bash
node postman/generate-collection.js
```

# Development and testing

Run Pick locally and execute the unit tests.

[← Back to the README](../README.md)

No build step is required, but ES module scripts need to be served over HTTP (not `file://`):

```bash
cd pick
python3 -m http.server 8080
# open http://localhost:8080
```

## Tests

Pure logic (probability, wheel geometry and motion, boundary-aligned audio timing, dice math, stats, and Catan turn/expiry state) is unit tested with Node's built-in test runner:

```bash
npm test
```

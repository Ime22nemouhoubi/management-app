const express = require('express');

// Express 4 does not catch errors thrown inside async handlers —
// they become unhandled rejections and crash the process (502 on Railway).
// This wraps every handler so errors reach the error middleware instead.
module.exports = function safeRouter() {
  const router = express.Router();
  for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) =>
      original(path, ...handlers.map(h =>
        (req, res, next) => Promise.resolve(h(req, res, next)).catch(next)
      ));
  }
  return router;
};

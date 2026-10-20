// house miner thread: searches nonces for one template and posts the first nonce whose digest is below the target
'use strict';
const { parentPort, workerData } = require('worker_threads'); const T = require('../client/tn-core.js'), { fromHex } = T.I;
const f = T.powFields(workerData.header), target = fromHex(workerData.header.target); let n = BigInt(workerData.start);
for (;;) { f[10] = T.u128(n); if (T.le256lt(T.powDigestFields(f), target)) { parentPort.postMessage(n.toString(16)); break; } n++; }

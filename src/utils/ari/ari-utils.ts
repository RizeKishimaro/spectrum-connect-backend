//
// // ari.js
// const Ari = require('ari-client');
//
// async function connectAri({
//   url = 'http://127.0.0.1:8088',
//   username = 'asterisk',
//   password = 'asterisk',
//   app = 'dialer-app',
// }) {
//   const client = await Ari.connect(url, username, password);
//
//   // Load the Stasis app
//   client.on('StasisStart', (event, channel) => {
//     console.log('[ARI] StasisStart', channel.id, event.args);
//   });
//
//   //client.start(app);
//   return client;
// }
//
// module.exports = { connectAri };


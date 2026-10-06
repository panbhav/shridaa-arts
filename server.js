require('dotenv').config({ quiet: true });
const { createApp } = require('./lib/server.cjs');
const port = Number(process.env.PORT || 3000);
const app = createApp();
app.listen(port, () => console.log('Shridaa Arts: http://localhost:' + port));

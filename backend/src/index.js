const pino = require('pino')();
const app = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => pino.info(`Server listening on ${port}`));

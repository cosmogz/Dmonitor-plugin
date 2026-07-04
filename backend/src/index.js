const pino = require('pino')();
const app = require('./app');

const port = process.env.PORT || 4002;
app.listen(port, () => pino.info(`Server listening on ${port}`));

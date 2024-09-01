import PinoHttp from 'pino-http';
import PinoPretty from 'pino-pretty';

const stream = PinoPretty({
  colorize: true,
  ignore: 'pid,hostname',
  translateTime: 'HH:MM:ss',
});

const pino = PinoHttp(
  {
    formatters: {
      level: (label) => ({ level: label }),
    },
  }
  // stream
);

export default pino;

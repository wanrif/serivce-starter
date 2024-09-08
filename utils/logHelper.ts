import PinoHttp from 'pino-http';
import PinoPretty from 'pino-pretty';

const stream = PinoPretty({
  colorize: true,
  ignore: 'pid,hostname',
  translateTime: 'SYS:HH:MM:ss.l',
});

const pino = PinoHttp(
  {
    formatters: {
      level: (label) => ({ level: label }),
    },
  },
  stream
);

export default pino;

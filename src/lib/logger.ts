import winston from "winston";

const { combine, timestamp, colorize, printf } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...extras }) => {
	const extraStr = Object.keys(extras).length
		? " " + JSON.stringify(extras)
		: "";
	return `\n[${level}]: ${timestamp} ${message}${extraStr}`;
});

const logger = winston.createLogger({
	level: "debug",
	format: combine(
		colorize(),
		timestamp({ format: "HH:mm:ss DD-MM-YYYY" }),
		logFormat,
	),
	transports: [new winston.transports.Console()],
});

export function getLogger(name: string) {
	return logger.child({ service: name });
}

export default logger;

const REGEX = {
	EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
	PASSWORD:
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
	PHONE: /^[1-9]\d{9}$/,
};

const LIMITS = {
	NAME_MIN: 2,
	NAME_MAX: 100,
	PASSWORD_MIN: 8,
};
export { REGEX, LIMITS };

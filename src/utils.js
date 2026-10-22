function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0;
}

function registrationIsOpen(eventStart, now = new Date()) {
  const start = new Date(eventStart);
  if (Number.isNaN(start.getTime())) return false;
  return now.getTime() < start.getTime() - 2 * 60 * 60 * 1000;
}

function cancellationIsAllowed(eventStart, now = new Date()) {
  const start = new Date(eventStart);
  if (Number.isNaN(start.getTime())) return false;
  return now.getTime() <= start.getTime() - 24 * 60 * 60 * 1000;
}

function httpError(status, message, code = "BUSINESS_RULE") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

module.exports = { positiveInteger, registrationIsOpen, cancellationIsAllowed, httpError };

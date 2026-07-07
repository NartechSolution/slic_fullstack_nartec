function response(status, success, message, data = null, error = null) {
  return {
    status: status,
    success: success,
    message: message,
    data: data,
    error: error,
  };
}

module.exports = response;

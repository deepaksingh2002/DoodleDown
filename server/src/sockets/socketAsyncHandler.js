import logger from '../utils/logger.js';
import { SOCKET_EVENTS } from '../config/constants.js';

function socketAsyncHandler(socket, handler) {
  return async (payload, callback) => {
    try {
      await handler(payload, callback);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Something went wrong';

      logger.error(`Socket error [${socket.id}]: ${message}`);

      socket.emit(SOCKET_EVENTS.ERROR, { statusCode, message });

      if (typeof callback === 'function') {
        callback({ success: false, message });
      }
    }
  };
}

export default socketAsyncHandler;

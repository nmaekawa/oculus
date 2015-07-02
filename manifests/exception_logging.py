import logging
logger = logging.getLogger(__name__)

class ExceptionLoggingMiddleware(object):
    def process_exception(self, request, exception):
        logger.debug('Exception handling request for ' + request.path + ':')
        logger.debug("\t" + str(exception))

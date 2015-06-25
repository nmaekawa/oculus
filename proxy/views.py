from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseForbidden
from manifests import ams
from manifests import webclient
from os import environ
from logging import getLogger

logger = getLogger(__name__)

WEB_SERVICE_URL = environ['PDS_WS_URL']
methods_allowed = ["printpdf",
                   "find",
                   "get"]


# view for proxy url
def proxy(request, method, record_id):
    if 'hulaccess' in request.COOKIES:
        ams_cookie = request.COOKIES['hulaccess']
    if not method in methods_allowed:
        return HttpResponseForbidden("Method not allowed by proxy")
    return webclient.get(WEB_SERVICE_URL + "/" + method + "/" + record_id + "?" + request.GET.urlencode())

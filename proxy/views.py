from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseForbidden
from manifests import ams
from manifests import webclient
from os import environ
from logging import getLogger

logger = getLogger(__name__)

WEB_SERVICE_URL = environ['PDS_WS_URL']
methods = {"printpdf": "application/pdf",
           "find": "application/xml",
           "get": "application/xml",
           "related": "application/xml",
           "cite": "application/json"}


# view for proxy url
def proxy(request, method, record_id):
    if not method in methods_allowed.keys():
        return HttpResponseForbidden("Method not allowed by proxy")

    if 'hulaccess' in request.COOKIES:
        ams_cookie = request.COOKIES['hulaccess']

    return HttpResponse(webclient.get(WEB_SERVICE_URL + method + "/" + record_id + "?" + request.GET.urlencode(), ams_cookie), content_type=methods[method])

"""
This will launch the LTI Annotation tool.

This is basically the controller part of the app. It will set up the tool provider, create/retrive the user and pass along any other information that will be rendered to the access/init screen to the user. 
"""

from ims_lti_py.tool_provider import DjangoToolProvider
from django.http import HttpResponseRedirect
from django.template import RequestContext

from django.core.exceptions import PermissionDenied
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404, render_to_response, render
from django.contrib.auth import login
from secure import SETTINGS
from django.contrib import messages

from hx_lti_initializer.models import LTIProfile, LTICourse

from models import *
from utils import *
from urlparse import urlparse
import sys

def validate_request(req):
    """
    Validates the request in order to permit or deny access to the LTI tool.
    """
 
    # verifies that request contains the information needed
    if 'oauth_consumer_key' not in req.POST:
        debug_printer('DEBUG - Consumer Key was not present in request.')
        raise PermissionDenied()
    if 'user_id' not in req.POST:
        debug_printer('DEBUG - Anonymous ID was not present in request.')
        raise PermissionDenied()

def initialize_lti_tool_provider(req):
    """
    """
    # get the consumer key and secret from settings (__init__.py file)
    # will be used to compare against request to validate the tool init
    consumer_key = SETTINGS['consumer_key']
    secret = SETTINGS['lti_secret']
    
    # use the function from ims_lti_py app to verify and initialize tool
    provider = DjangoToolProvider(consumer_key, secret, req.POST)

    # now validate the tool via the valid_request function
    try:
        # this means that request was well formed but invalid
        if provider.valid_request(req) == False:
            #debug_printer("DEBUG - LTI Exception: Not a valid request.")
            raise PermissionDenied()
    except Exception as e:
        debug_printer("There was an exception")
        raise PermissionDenied()
    return provider

@csrf_exempt
def launch_lti(request):
    """
    Gets a request from an LTI consumer.
    Passes along information to render a welcome screen to the user.
    """
    
    validate_request(request)
    tool_provider = initialize_lti_tool_provider(request)

    # the three main things needed for this to work: anon_id, oauth handshake, manifest links
    consumer_key_requested = request.POST['oauth_consumer_key']
    user_id = get_lti_value('user_id', tool_provider)
    object_ids = get_lti_value(SETTINGS['objects'], tool_provider)
    objects = []
    if object_ids:
        objects = object_ids.split(';')


    # course and collection are only needed if there will be calls made to/from CATCHpy
    course = get_lti_value(SETTINGS['course_id'], tool_provider)
    if course is None:
        course = ''
    
    collection = get_lti_value(SETTINGS['collection_id'], tool_provider)
    if collection is None:
        collection = ''

    # mirador options
    layout_param = get_lti_value(SETTINGS['layout'], tool_provider)
    if layout_param:
        layout = layout_param
    else:
        layout = "1x1"
    
    # window specific parameters
    view_type = get_lti_value(SETTINGS['view_type'], tool_provider)
    if not view_type:
        view_type = "ImageView"

    canvas_ids = get_lti_value(SETTINGS['canvas_id'], tool_provider)
    if canvas_ids is None:
        canvas_ids = get_lti_value(SETTINGS['canvas_ids'], tool_provider)
    canvases = []
    if canvas_ids:
        canvases = canvas_ids.split(';')
    
    object_canvas_ids = {}
    for object in objects:
        found_canvas = False
        for canvas in canvases:
            if object in canvas:
                object_canvas_ids[object] = canvas.replace(" ", "")
                found_canvas = True
        if not found_canvas:
            object_canvas_ids[object] = ""

    # annotation parameters
    show_annotations = get_lti_value(SETTINGS['show_anns'], tool_provider)
    if not show_annotations or show_annotations.lower() != 'false':
        show_annotations = 'true'
    else:
        show_annotations = show_annotations.lower()

    show_annotation_creation = get_lti_value(SETTINGS['show_ann_creation'], tool_provider)
    if not show_annotation_creation or show_annotation_creation.lower() != 'false':
        show_annotation_creation = 'true'
    else:
        show_annotation_creation = show_annotation_creation.lower()

    username = get_lti_value('lis_person_name_full', tool_provider)

    if username is None:
        username = get_lti_value('lis_person_sourcedid', tool_provider)
        if username is None:
            username = "Student"

    # add x-frame-allowed header, rather than doing it in Apache
    x_frame_allowed = False
    parsed_uri = urlparse(request.META.get('HTTP_REFERER'))
    domain = '{uri.scheme}://{uri.netloc}'.format(uri=parsed_uri)
    for item in SETTINGS['x_frame_allowed_sites']:
        if domain.endswith(item):
            x_frame_allowed = True
            break

    response = render(request, 'index.html', {
        'username'  : username,
        'user_id'   : user_id,
        'collection': collection,
        'course'    : course, 
        'layout'    : layout,
        'objects'   : objects,
        'view_type' : view_type,
        'object_canvas_ids' : object_canvas_ids,
        'token'     : retrieve_token(user_id, ''),
        'show_annotations' : show_annotations,
        'show_annotation_creation' : show_annotation_creation
    })

    if not x_frame_allowed:
        response['X-Frame-Options'] = "DENY"
    else :
        response['X-Frame-Options'] = "ALLOW FROM " + domain

    return response

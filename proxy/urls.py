from django.conf.urls import patterns, url
from django.conf import settings

from proxy import views

urlpatterns = patterns('',
                       url(r'^(?P<method>[^/]*)/(?P<record_id>[^/?]*)$', views.proxy, name='proxy')
                       ,)

from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'oculus.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^manifests/', include('manifests.urls')),
    url(r'^lti_init/', include('hx-basic-lti.urls', namespace="hx-basic-lti")),
    url(r'^admin/', include(admin.site.urls)),
)

"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.passwords import PasswordChangeView, PasswordResetConfirmView, PasswordResetRequestView
from accounts.views import LoginView, LogoutView, MeView, RegisterView
from applications.views import AnalyticsView, ApplicationViewSet, DashboardView, InterviewViewSet

from .views import HealthView

router = DefaultRouter()
router.register('applications', ApplicationViewSet, basename='application')
router.register('interviews', InterviewViewSet, basename='interview')

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/health/', HealthView.as_view()),
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/login/', LoginView.as_view()),
    path('api/auth/logout/', LogoutView.as_view()),
    path('api/auth/me/', MeView.as_view()),
    path('api/auth/password-reset/', PasswordResetRequestView.as_view()),
    path('api/auth/password-reset/confirm/', PasswordResetConfirmView.as_view()),
    path('api/auth/password-change/', PasswordChangeView.as_view()),
    path('api/dashboard/', DashboardView.as_view()),
    path('api/analytics/', AnalyticsView.as_view()),
    path('api/', include(router.urls)),
]

from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import Application, Interview


class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        exclude = ['user']  # always the signed-in user, set by the view

    # DRF does not call Model.clean(), so the salary check is repeated here.
    def validate(self, attrs):
        salary_min = attrs.get('salary_min', getattr(self.instance, 'salary_min', None))
        salary_max = attrs.get('salary_max', getattr(self.instance, 'salary_max', None))
        if salary_min is not None and salary_max is not None and salary_min > salary_max:
            raise serializers.ValidationError(
                {'salary_max': _('Must be at least the minimum salary.')}
            )
        return attrs

    def create(self, validated_data):
        # Anything past the wishlist was applied for; default to today if no date was given.
        if validated_data.get('status', Application.Status.APPLIED) != Application.Status.WISHLIST:
            validated_data.setdefault('application_date', timezone.localdate())
        return super().create(validated_data)


class InterviewSerializer(serializers.ModelSerializer):
    # Read-only extras so the dashboard can show an interview without a second request.
    company_name = serializers.CharField(source='application.company_name', read_only=True)
    job_title = serializers.CharField(source='application.job_title', read_only=True)

    class Meta:
        model = Interview
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only your own applications can get an interview; anyone else's id reads as "does not exist".
        request = self.context.get('request')
        if request is not None:
            self.fields['application'].queryset = Application.objects.owned_by(request.user)

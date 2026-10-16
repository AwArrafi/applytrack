from django.db import migrations, models

# Old code -> new code. "On-site" was a format, not a stage (location already covers it).
FORWARD = {
    'phone_screen': 'hr_interview',
    'behavioral': 'user_interview',
    'technical': 'skills_test',
    'final': 'final_interview',
    'onsite': 'other',
}
# Best-effort way back; the stages that didn't exist before become "other".
BACKWARD = {
    'hr_interview': 'phone_screen',
    'user_interview': 'behavioral',
    'skills_test': 'technical',
    'final_interview': 'final',
    'psychotest': 'other',
    'group_discussion': 'other',
    'medical_checkup': 'other',
}


def remap(mapping):
    def run(apps, schema_editor):
        Interview = apps.get_model('applications', 'Interview')
        for old, new in mapping.items():
            Interview.objects.filter(interview_type=old).update(interview_type=new)
    return run


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0002_interview_debrief'),
    ]

    operations = [
        migrations.RunPython(remap(FORWARD), remap(BACKWARD)),
        migrations.AlterField(
            model_name='interview',
            name='interview_type',
            field=models.CharField(
                choices=[
                    ('hr_interview', 'HR interview'),
                    ('user_interview', 'Interview with the hiring manager (user)'),
                    ('skills_test', 'Skills test / case study'),
                    ('psychotest', 'Psychological test'),
                    ('group_discussion', 'Group discussion (FGD)'),
                    ('final_interview', 'Final interview'),
                    ('medical_checkup', 'Medical check-up'),
                    ('other', 'Other'),
                ],
                default='other',
                max_length=20,
            ),
        ),
    ]

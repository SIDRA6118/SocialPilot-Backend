# Generated migration for Milestone 2

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0003_teammember_scheduledpost_content_type_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add new fields to ScheduledPost
        migrations.AddField(
            model_name='scheduledpost',
            name='recurrence_end_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='scheduledpost',
            name='parent_post',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, 
                                   related_name='recurring_instances', to='scheduler.scheduledpost'),
        ),
        migrations.AddField(
            model_name='scheduledpost',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        # Alter status field to have more choices (from original default='scheduled')
        migrations.AlterField(
            model_name='scheduledpost',
            name='status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('scheduled', 'Scheduled'), ('processing', 'Processing'), 
                        ('published', 'Published'), ('failed', 'Failed'), ('cancelled', 'Cancelled')],
                default='scheduled',
                max_length=20,
            ),
        ),
        # Change user ForeignKey relationship name
        migrations.AlterField(
            model_name='scheduledpost',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scheduled_posts', 
                                    to=settings.AUTH_USER_MODEL),
        ),
        # Create Draft model
        migrations.CreateModel(
            name='Draft',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('platform', models.CharField(blank=True, max_length=50)),
                ('content_type', models.CharField(choices=[('text', 'Text'), ('image', 'Image'), ('video', 'Video'), 
                                                          ('carousel', 'Carousel'), ('story', 'Story'), ('reel', 'Reel')],
                                                 default='text', max_length=20)),
                ('media_url', models.URLField(blank=True)),
                ('title', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='drafts', 
                                          to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-updated_at'],
            },
        ),
        # Create PublishingLog model
        migrations.CreateModel(
            name='PublishingLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('platform', models.CharField(max_length=50)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), 
                                                    ('published', 'Published'), ('failed', 'Failed')],
                                           default='pending', max_length=20)),
                ('platform_response', models.JSONField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('max_attempts', models.PositiveIntegerField(default=3)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='publishing_logs', 
                                          to='scheduler.scheduledpost')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        # Create PublishingQueue model
        migrations.CreateModel(
            name='PublishingQueue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), 
                                                    ('completed', 'Completed'), ('failed', 'Failed')],
                                           default='pending', max_length=20)),
                ('scheduled_for', models.DateTimeField()),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('last_attempt', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='queue_entries', 
                                          to='scheduler.scheduledpost')),
            ],
            options={
                'ordering': ['scheduled_for', 'created_at'],
            },
        ),
        # Add indexes to PublishingQueue
        migrations.AddIndex(
            model_name='publishingqueue',
            index=models.Index(fields=['status', 'scheduled_for'], name='scheduler_p_status_idx'),
        ),
    ]

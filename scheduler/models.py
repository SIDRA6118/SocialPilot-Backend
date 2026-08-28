from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User


class ScheduledPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    platform = models.CharField(max_length=50)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.platform} - {self.scheduled_time}"
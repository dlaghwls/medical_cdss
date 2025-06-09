# openmrs_integration/models.py
from django.db import models
import uuid # UUID 필드를 위해

class OpenMRSPatient(models.Model):
    uuid = models.UUIDField(primary_key=True, editable=False, help_text="OpenMRS Patient UUID")
    display_name = models.CharField(max_length=255, blank=True, null=True, help_text="Patient's full name or display name")
    identifier = models.CharField(max_length=100, blank=True, null=True, unique=True, help_text="Primary OpenMRS ID")
    given_name = models.CharField(max_length=100, blank=True, null=True)
    family_name = models.CharField(max_length=100, blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    raw_openmrs_data = models.JSONField(blank=True, null=True, help_text="Raw patient data from OpenMRS as JSON")
    created_at = models.DateTimeField(auto_now_add=True) # Django DB에 처음 저장된 시간
    updated_at = models.DateTimeField(auto_now=True)   # Django DB에서 마지막으로 업데이트된 시간

    def __str__(self):
        return self.display_name or str(self.uuid)

    class Meta:
        verbose_name = "OpenMRS Patient Record"
        verbose_name_plural = "OpenMRS Patient Records"
        ordering = ['family_name', 'given_name']
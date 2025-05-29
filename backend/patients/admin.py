from django.contrib import admin
from .models import Patient, Visit, VitalSigns

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'name', 'gender', 'birth_date', 'age', 'phone', 'created_at']
    list_filter = ['gender', 'blood_type', 'created_at']
    search_fields = ['patient_id', 'name', 'phone', 'email']
    readonly_fields = ['age', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본정보', {
            'fields': ('patient_id', 'name', 'birth_date', 'gender', 'phone', 'email', 'address')
        }),
        ('의료정보', {
            'fields': ('blood_type', 'allergies', 'medical_history')
        }),
        ('OpenMRS 연동', {
            'fields': ('openmrs_patient_id',),
            'classes': ('collapse',)
        }),
        ('시스템정보', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ['visit_number', 'patient', 'visit_type', 'status', 'visit_date', 'attending_doctor']
    list_filter = ['visit_type', 'status', 'department', 'visit_date']
    search_fields = ['visit_number', 'patient__name', 'patient__patient_id', 'chief_complaint']
    date_hierarchy = 'visit_date'
    
    fieldsets = (
        ('기본정보', {
            'fields': ('patient', 'visit_number', 'visit_type', 'status')
        }),
        ('일정정보', {
            'fields': ('visit_date', 'end_date', 'attending_doctor', 'department')
        }),
        ('진료정보', {
            'fields': ('chief_complaint', 'diagnosis', 'treatment_plan', 'notes')
        }),
        ('OpenMRS 연동', {
            'fields': ('openmrs_visit_id',),
            'classes': ('collapse',)
        }),
    )

@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ['visit', 'measured_at', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'temperature', 'bmi']
    list_filter = ['measured_at', 'measured_by']
    search_fields = ['visit__patient__name', 'visit__visit_number']
    date_hierarchy = 'measured_at'
    readonly_fields = ['bmi']
    
    fieldsets = (
        ('방문정보', {
            'fields': ('visit', 'measured_by', 'measured_at')
        }),
        ('활력징후', {
            'fields': ('systolic_bp', 'diastolic_bp', 'heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation')
        }),
        ('신체계측', {
            'fields': ('height', 'weight', 'bmi')
        }),
    )

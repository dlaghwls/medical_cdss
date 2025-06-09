import requests
from rest_framework.response import Response
from rest_framework.decorators import api_view

ORTHANC_URL = "http://orthanc:8042"

@api_view(['GET'])
def get_dicom_studies(request, uuid):
    # TODO: Orthanc와 OpenMRS 환자 매핑이 없다면 임시로 전부 가져옴
    try:
        patients = requests.get(f"{ORTHANC_URL}/patients").json()
        results = []
        for patient_id in patients:
            studies = requests.get(f"{ORTHANC_URL}/patients/{patient_id}/studies").json()
            for study_id in studies:
                meta = requests.get(f"{ORTHANC_URL}/studies/{study_id}").json()
                results.append(meta)
        return Response(results)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

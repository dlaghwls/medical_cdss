# openmrs_integration/views.py
import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
from django.http import JsonResponse
# from rest_framework.decorators import api_view # DRF 사용 시
# from rest_framework.response import Response # DRF 사용 시
# from rest_framework import status # DRF 사용 시

OPENMRS_API_BASE_URL = settings.OPENMRS_API_BASE_URL
OPENMRS_USER = settings.OPENMRS_USERNAME
OPENMRS_PASS = settings.OPENMRS_PASSWORD

def get_openmrs_patients_list(request):
    query = request.GET.get('q', '')
    view_representation = request.GET.get('v', 'full') # 'full'로 시도, 또는 'default'
    limit = request.GET.get('limit', '50') 
    start_index = request.GET.get('startIndex', '0')

    api_url = f"{OPENMRS_API_BASE_URL}/patient?v={view_representation}&limit={limit}&startIndex={start_index}"
    if query:
        api_url += f"&q={query}" # query 파라미터는 항상 마지막에 추가하는 것이 더 안전할 수 있음
    
    print(f"Django requesting OpenMRS (patients list): {api_url}")

    try:
        response = requests.get(
            api_url,
            auth=HTTPBasicAuth(OPENMRS_USER, OPENMRS_PASS),
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'  # <--- 이 줄을 추가하여 JSON 응답을 명시적으로 요청
            }
        )
        response.raise_for_status()
        
        data_to_send = response.json().get('results', [])
        return JsonResponse({'patients': data_to_send})

    except requests.exceptions.HTTPError as http_err:
        error_detail = http_err.response.text if http_err.response else str(http_err)
        print(f"OpenMRS API HTTP Error (patients list): {http_err.response.status_code if http_err.response else 'N/A'} - Details: {error_detail}")
        return JsonResponse({'error': f'OpenMRS API Error: {http_err.response.status_code if http_err.response else "Unknown HTTP Error"}', 'details': error_detail}, status=http_err.response.status_code if http_err.response else 500)
    except requests.exceptions.RequestException as req_err: # requests.json() 실패도 포함될 수 있음
        print(f"Request to OpenMRS failed or invalid JSON response (patients list): {req_err}")
        # JSONDecodeError 등을 여기서 처리할 수도 있습니다.
        return JsonResponse({'error': f'Request to OpenMRS failed or invalid JSON: {req_err}'}, status=503)
    except Exception as e:
        print(f"An unexpected error occurred (patients list): {e}")
        return JsonResponse({'error': f'An unexpected error occurred: {e}'}, status=500)


def get_openmrs_patient_detail(request, patient_uuid):
    view_representation = request.GET.get('v', 'full')
    api_url = f"{OPENMRS_API_BASE_URL}/patient/{patient_uuid}?v={view_representation}"

    print(f"Django requesting OpenMRS (patient detail): {api_url}")

    try:
        response = requests.get(
            api_url,
            auth=HTTPBasicAuth(OPENMRS_USER, OPENMRS_PASS),
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'  # <--- 이 줄을 추가
            }
        )
        response.raise_for_status()
        return JsonResponse(response.json())
    except requests.exceptions.HTTPError as http_err:
        error_detail = http_err.response.text if http_err.response else str(http_err)
        print(f"OpenMRS API HTTP Error (patient detail for {patient_uuid}): {http_err.response.status_code if http_err.response else 'N/A'} - Details: {error_detail}")
        return JsonResponse({'error': f'OpenMRS API Error: {http_err.response.status_code if http_err.response else "Unknown HTTP Error"}', 'details': error_detail}, status=http_err.response.status_code if http_err.response else 500)
    except requests.exceptions.RequestException as req_err: # requests.json() 실패도 포함될 수 있음
        print(f"Request to OpenMRS for patient {patient_uuid} failed or invalid JSON response: {req_err}")
        return JsonResponse({'error': f'Request to OpenMRS for patient {patient_uuid} failed or invalid JSON: {req_err}'}, status=503)
    except Exception as e:
        print(f"An unexpected error occurred for patient {patient_uuid}: {e}")
        return JsonResponse({'error': f'An unexpected error occurred for patient {patient_uuid}: {e}'}, status=500)
# # openmrs_integration/views.py
# import requests
# from requests.auth import HTTPBasicAuth
# from django.conf import settings
# from django.http import JsonResponse, Http404
# from .models import OpenMRSPatient # Django 모델 임포트
# from django.db.models import Q
# import uuid
# import json # JSON 파싱 및 저장을 위해 (raw_openmrs_data가 JSONField가 아니라면 필요)

# # settings.py에서 OpenMRS 접속 정보 가져오기
# OPENMRS_API_BASE_URL = getattr(settings, 'OPENMRS_API_BASE_URL', 'http://localhost:8080/openmrs/ws/rest/v1')
# OPENMRS_USERNAME = getattr(settings, 'OPENMRS_USERNAME', 'admin')
# OPENMRS_PASSWORD = getattr(settings, 'OPENMRS_PASSWORD', 'Admin123')

# def get_openmrs_patients_list(request):
#     query = request.GET.get('q', '')
#     # OpenMRS API가 지원하는 페이징 파라미터 (예: limit, startIndex)를 사용해야 합니다.
#     # Django ORM 페이징은 OpenMRS에서 모든 데이터를 가져온 후에만 의미가 있습니다.
#     # 여기서는 React에서 limit, startIndex를 보내고 이를 OpenMRS API 호출에 그대로 사용한다고 가정합니다.
#     limit = request.GET.get('limit', settings.OPENMRS_PATIENT_LIST_DEFAULT_LIMIT if hasattr(settings, 'OPENMRS_PATIENT_LIST_DEFAULT_LIMIT') else 50)
#     start_index = request.GET.get('startIndex', '0')

#     try:
#         # OpenMRS API에서 환자 목록 가져오기
#         # ★★★ OpenMRS API 문서에서 '모든 환자' 또는 '검색된 환자' 목록을 가져오는
#         # 정확한 URL과 파라미터를 확인하고 이 부분을 수정해야 합니다. ★★★
#         api_url = f"{OPENMRS_API_BASE_URL}/patient?v=full" # 기본적으로 full representation 요청
        
#         params = {
#             'v': 'full', # 상세 정보를 위해 full view 요청
#             'limit': limit,
#             'startIndex': start_index
#         }
#         if query:
#             params['q'] = query
        
#         print(f"Requesting OpenMRS API for patient list: {api_url} with params: {params}")
#         response = requests.get(
#             api_url,
#             params=params, # GET 파라미터는 params 인자로 전달
#             auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD),
#             headers={'Content-Type': 'application/json'}
#         )
#         response.raise_for_status() # 4xx 또는 5xx 오류 발생 시 예외 발생
#         openmrs_patients_response = response.json()
#         openmrs_patients_list = openmrs_patients_response.get('results', [])
#         print(f"Successfully fetched {len(openmrs_patients_list)} patients from OpenMRS.")

#         # (선택사항) 가져온 환자들을 Django DB에 저장/업데이트
#         # 실제 운영 환경에서는 이 부분을 비동기 작업으로 처리하거나,
#         # 필요한 경우에만 동기화하는 전략을 고려해야 합니다.
#         for patient_data in openmrs_patients_list:
#             try:
#                 patient_uuid_str = patient_data.get('uuid')
#                 if not patient_uuid_str:
#                     continue # uuid가 없는 데이터는 건너뛰기

#                 valid_uuid = uuid.UUID(patient_uuid_str)
                
#                 # identifier는 리스트일 수 있으므로 첫 번째 것을 사용하거나 다른 로직 필요
#                 identifiers = patient_data.get('identifiers', [])
#                 main_identifier = identifiers[0].get('identifier') if identifiers else None

#                 person_data = patient_data.get('person', {})
#                 preferred_name = person_data.get('preferredName', {})

#                 OpenMRSPatient.objects.update_or_create(
#                     uuid=valid_uuid,
#                     defaults={
#                         'display_name': patient_data.get('display'),
#                         'identifier': main_identifier,
#                         'given_name': preferred_name.get('givenName'),
#                         'family_name': preferred_name.get('familyName'),
#                         'gender': person_data.get('gender'),
#                         'birthdate': person_data.get('birthdate', None), # 날짜 형식 변환 필요시 처리
#                         'raw_openmrs_data': patient_data # 원본 JSON 저장
#                     }
#                 )
#             except Exception as db_error:
#                 print(f"Error saving/updating patient {patient_data.get('uuid')} to Django DB: {db_error}")
#                 # 개별 환자 저장 오류는 전체 요청을 실패시키지 않도록 처리 (선택적)

#         # React에서 사용할 수 있도록 OpenMRS API 응답과 유사한 형태로 반환
#         # totalCount는 OpenMRS API가 페이징 정보를 제공한다면 그 값을 사용해야 합니다.
#         # 여기서는 가져온 목록의 길이로 단순화하거나, 응답에 total이 있다면 그 값을 사용합니다.
#         # 실제 totalCount는 OpenMRS API 응답 헤더나 다른 필드에 있을 수 있습니다.
#         api_total_count = openmrs_patients_response.get('total', len(openmrs_patients_list)) # 예시, 실제 필드명 확인 필요

#         return JsonResponse({'results': openmrs_patients_list, 'totalCount': api_total_count })

#     except requests.exceptions.HTTPError as err:
#         error_message = f'Error fetching patient list from OpenMRS: {err.response.status if err.response else ""} {err.response.reason if err.response else ""}'
#         error_detail = err.response.text if err.response else 'No response text'
#         print(f"HTTP error fetching patient list from OpenMRS: {err} - {error_detail}")
#         return JsonResponse({'error': error_message, 'detail': error_detail}, status=err.response.status_code if err.response else 500)
#     except requests.exceptions.RequestException as err:
#         print(f"Network error connecting to OpenMRS for patient list: {err}")
#         return JsonResponse({'error': f'Network error connecting to OpenMRS: {err}'}, status=503)
#     except Exception as e:
#         print(f"An unexpected error occurred in get_openmrs_patients_list: {e}")
#         return JsonResponse({'error': f'An unexpected server error occurred: {str(e)}'}, status=500)


# def get_openmrs_patient_detail(request, patient_uuid):
#     try:
#         valid_uuid = uuid.UUID(str(patient_uuid)) # UUID 형식 유효성 검사
        
#         # 전략 1: 항상 OpenMRS에서 최신 정보를 가져와서 Django DB에 업데이트 후 반환
#         # 전략 2: Django DB에 있으면 바로 반환, 없으면 OpenMRS에서 가져와서 저장 후 반환 (캐싱)
#         # 여기서는 전략 2와 유사하게, 하지만 OpenMRS 우선 조회를 시도합니다.

#         print(f"Attempting to fetch patient {valid_uuid} detail from OpenMRS...")
#         api_url = f"{OPENMRS_API_BASE_URL}/patient/{valid_uuid}?v=full"
        
#         response = requests.get(
#             api_url,
#             auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD),
#             headers={'Content-Type': 'application/json'}
#         )
#         response.raise_for_status() 
#         openmrs_patient_data = response.json()
#         print(f"Successfully fetched data from OpenMRS for patient {valid_uuid}")

#         # 가져온 데이터를 Django DB에 저장 또는 업데이트
#         try:
#             identifiers = openmrs_patient_data.get('identifiers', [])
#             main_identifier = identifiers[0].get('identifier') if identifiers else None
#             person_data = openmrs_patient_data.get('person', {})
#             preferred_name = person_data.get('preferredName', {})

#             patient_obj, created = OpenMRSPatient.objects.update_or_create(
#                 uuid=valid_uuid,
#                 defaults={
#                     'display_name': openmrs_patient_data.get('display'),
#                     'identifier': main_identifier,
#                     'given_name': preferred_name.get('givenName'),
#                     'family_name': preferred_name.get('familyName'),
#                     'gender': person_data.get('gender'),
#                     'birthdate': person_data.get('birthdate', None),
#                     'raw_openmrs_data': openmrs_patient_data
#                 }
#             )
#             if created:
#                 print(f"Patient {valid_uuid} created in Django DB from OpenMRS data.")
#             else:
#                 print(f"Patient {valid_uuid} updated in Django DB from OpenMRS data.")
#         except Exception as db_error:
#             print(f"Error saving/updating patient {valid_uuid} to Django DB after fetching from OpenMRS: {db_error}")
#             # DB 저장 실패는 전체 요청을 실패시키지 않고 OpenMRS 데이터만 반환할 수 있음 (선택적)

#         return JsonResponse(openmrs_patient_data) # OpenMRS에서 가져온 원본 데이터 반환

#     except ValueError:
#         return JsonResponse({'error': 'Invalid UUID format'}, status=400)
#     except requests.exceptions.HTTPError as err:
#         if err.response.status_code == 404:
#             # OpenMRS에도 환자가 없는 경우
#             # 이전에 로컬 DB에서 못 찾았다는 메시지를 React에 전달했으므로,
#             # 여기서는 OpenMRS에도 없었다는 것을 명확히 하거나, 동일한 404를 유지
#             return JsonResponse({'error': f'Patient not found in OpenMRS (UUID: {patient_uuid})'}, status=404)
#         else:
#             error_message = f'Error fetching detail from OpenMRS: {err.response.status} {err.response.reason}'
#             error_detail = err.response.text if err.response else 'No response text'
#             print(f"HTTP error fetching detail from OpenMRS: {err} - {error_detail}")
#             return JsonResponse({'error': error_message, 'detail': error_detail}, status=err.response.status_code)
#     except requests.exceptions.RequestException as err:
#         print(f"Network error connecting to OpenMRS for patient detail: {err}")
#         return JsonResponse({'error': f'Network error connecting to OpenMRS: {err}'}, status=503)
#     except Exception as e:
#         print(f"An unexpected error occurred in get_openmrs_patient_detail: {e}")
#         return JsonResponse({'error': f'An unexpected server error occurred: {str(e)}'}, status=500)

# openmrs_integration/views.py
import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
from django.http import JsonResponse, Http404
from .models import OpenMRSPatient # Django 모델 임포트
from django.db.models import Q
import uuid
import json

# settings.py에서 OpenMRS 접속 정보 가져오기 (get_openmrs_patient_detail 등에서 사용)
OPENMRS_API_BASE_URL = getattr(settings, 'OPENMRS_API_BASE_URL', 'http://localhost:8080/openmrs/ws/rest/v1')
OPENMRS_USERNAME = getattr(settings, 'OPENMRS_USERNAME', 'admin')
OPENMRS_PASSWORD = getattr(settings, 'OPENMRS_PASSWORD', 'Admin123')

# --- 환자 목록 조회: Django DB에서만 조회 ---
def get_django_patients_list(request):
    query = request.GET.get('q', '')
    limit = int(request.GET.get('limit', 50)) # 기본값을 50으로 설정하거나 settings에서 가져옴
    start_index = int(request.GET.get('startIndex', '0'))
    
    print(f"Fetching patients from Django DB with query: '{query}', limit: {limit}, startIndex: {start_index}")

    try:
        patients_qs = OpenMRSPatient.objects.all().order_by('display_name') # 기본 정렬 추가

        if query:
            patients_qs = patients_qs.filter(
                Q(display_name__icontains=query) | 
                Q(identifier__icontains=query) |
                Q(given_name__icontains=query) |
                Q(family_name__icontains=query) |
                Q(uuid__icontains=query) # UUID로도 검색 가능하도록 추가 (선택적)
            )
        
        total_patients = patients_qs.count()
        patients_page = patients_qs[start_index : start_index + limit]

        patients_data = []
        for patient in patients_page:
            # OpenMRS API 응답과 유사한 구조로 만듭니다.
            # display 필드는 OpenMRS 'display'와 동일하게 이름 + ID 형태일 수 있습니다.
            # 여기서는 모델의 필드를 직접 사용합니다.
            person_data_from_raw = patient.raw_openmrs_data.get('person', {}) if patient.raw_openmrs_data else {}
            
            patients_data.append({
                'uuid': str(patient.uuid),
                'display': patient.display_name or f"{patient.given_name or ''} {patient.family_name or ''} - {patient.identifier or str(patient.uuid)[:8]}".strip(),
                'identifiers': [{'identifier': patient.identifier}] if patient.identifier else [], # OpenMRS 구조와 유사하게
                'person': { # OpenMRS person 객체 구조와 유사하게 (필요한 정보만)
                    'display': f"{patient.given_name or ''} {patient.family_name or ''}".strip(),
                    'gender': patient.gender,
                    'birthdate': patient.birthdate.isoformat() if patient.birthdate else None,
                    'preferredName': {
                        'givenName': patient.given_name,
                        'familyName': patient.family_name,
                    }
                    # 필요시 person_data_from_raw 에서 다른 정보 추가
                }
                # 필요하다면 다른 OpenMRS 응답 필드와 유사하게 추가
            })
                
        print(f"Returning {len(patients_data)} patients from Django DB. Total matching: {total_patients}")
        return JsonResponse({'results': patients_data, 'totalCount': total_patients})

    except Exception as e:
        print(f"Error in get_django_patients_list: {e}")
        return JsonResponse({'error': f'An unexpected error occurred while fetching from Django DB: {str(e)}'}, status=500)


# --- 단일 환자 상세 정보 조회: Django DB에 없으면 OpenMRS에서 가져와 저장 후 반환 ---
def get_openmrs_patient_detail(request, patient_uuid):
    try:
        valid_uuid = uuid.UUID(str(patient_uuid))
        
        # 1. Django 로컬 DB에서 먼저 찾아봅니다.
        try:
            patient_model_instance = OpenMRSPatient.objects.get(uuid=valid_uuid)
            if patient_model_instance.raw_openmrs_data: # 저장된 원본 JSON 데이터가 있다면 그것을 반환
                print(f"Fetching patient {valid_uuid} from Django DB (raw_openmrs_data)")
                return JsonResponse(patient_model_instance.raw_openmrs_data)
            else: # 원본 JSON은 없지만 모델 필드는 있을 경우, 구성해서 반환 (또는 OpenMRS에서 다시 가져오기)
                print(f"Patient {valid_uuid} found in Django DB but no raw_openmrs_data, constructing from model or fetching from OpenMRS...")
                # 여기서는 OpenMRS에서 다시 가져오도록 로직을 이어갑니다.
                # 만약 모델 필드만으로 충분하다면 여기서 바로 JsonResponse를 구성해도 됩니다.
                pass 
        except OpenMRSPatient.DoesNotExist:
            print(f"Patient {valid_uuid} not found in Django DB, will fetch from OpenMRS...")
            pass # OpenMRS에서 가져오도록 아래 로직으로 넘어감

        # 2. OpenMRS에서 환자 정보 가져오기 (Django DB에 없거나 raw_openmrs_data가 없는 경우)
        api_url = f"{OPENMRS_API_BASE_URL}/patient/{valid_uuid}?v=full"
        print(f"Requesting OpenMRS API for patient detail: {api_url}")
        
        response = requests.get(
            api_url,
            auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD),
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status() 
        openmrs_patient_data = response.json()
        print(f"Successfully fetched data from OpenMRS for patient {valid_uuid}")

        # 3. 가져온 데이터를 Django DB에 저장 또는 업데이트
        try:
            identifiers = openmrs_patient_data.get('identifiers', [])
            main_identifier = identifiers[0].get('identifier') if identifiers else None
            person_data = openmrs_patient_data.get('person', {})
            preferred_name = person_data.get('preferredName', {})

            patient_obj, created = OpenMRSPatient.objects.update_or_create(
                uuid=valid_uuid,
                defaults={
                    'display_name': openmrs_patient_data.get('display'),
                    'identifier': main_identifier,
                    'given_name': preferred_name.get('givenName'),
                    'family_name': preferred_name.get('familyName'),
                    'gender': person_data.get('gender'),
                    'birthdate': person_data.get('birthdate', None),
                    'raw_openmrs_data': openmrs_patient_data # 원본 JSON 저장
                }
            )
            if created:
                print(f"Patient {valid_uuid} created in Django DB from OpenMRS data.")
            else:
                print(f"Patient {valid_uuid} updated in Django DB from OpenMRS data.")
        except Exception as db_error:
            print(f"Error saving/updating patient {valid_uuid} to Django DB: {db_error}")
            # DB 저장 실패는 전체 요청을 실패시키지 않고 OpenMRS 데이터만 반환 (선택적)

        return JsonResponse(openmrs_patient_data)

    except ValueError:
        return JsonResponse({'error': 'Invalid UUID format'}, status=400)
    except requests.exceptions.HTTPError as err:
        if err.response.status_code == 404:
            return JsonResponse({'error': f'Patient not found in OpenMRS (UUID: {patient_uuid})'}, status=404)
        else:
            # ... (이전과 동일한 상세 에러 처리) ...
            error_message = f'Error fetching detail from OpenMRS: {err.response.status} {err.response.reason}'
            error_detail = err.response.text if err.response else 'No response text'
            print(f"HTTP error fetching detail from OpenMRS: {err} - {error_detail}")
            return JsonResponse({'error': error_message, 'detail': error_detail}, status=err.response.status_code)
    except requests.exceptions.RequestException as err:
        print(f"Network error connecting to OpenMRS for patient detail: {err}")
        return JsonResponse({'error': f'Network error connecting to OpenMRS: {err}'}, status=503)
    except Exception as e:
        print(f"An unexpected error occurred in get_openmrs_patient_detail: {e}")
        return JsonResponse({'error': f'An unexpected server error occurred: {str(e)}'}, status=500)
# openmrs_integration/views.py
import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
from django.http import JsonResponse 
from .models import OpenMRSPatient 
from django.db.models import Q
import uuid
from datetime import datetime, date 
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny 
from rest_framework.response import Response
from rest_framework import status
from .utils import perform_openmrs_patient_sync 
# from .serializers import OpenMRSPatientSerializer # Serializer를 사용한다면 주석 해제

OPENMRS_API_BASE_URL = getattr(settings, 'OPENMRS_API_BASE_URL', 'http://localhost:8080/openmrs/ws/rest/v1')
OPENMRS_USERNAME = getattr(settings, 'OPENMRS_USERNAME', 'admin')
OPENMRS_PASSWORD = getattr(settings, 'OPENMRS_PASSWORD', 'Admin123')

# settings.py에서 환자 등록 시 사용할 기본 UUID들 가져오기
DEFAULT_IDENTIFIER_TYPE_UUID = getattr(settings, 'DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID', None) 
DEFAULT_LOCATION_UUID = getattr(settings, 'DEFAULT_OPENMRS_LOCATION_UUID', None)
PHONE_NUMBER_ATTRIBUTE_TYPE_UUID = getattr(settings, 'OPENMRS_PHONE_ATTRIBUTE_TYPE_UUID', None)


@api_view(['GET'])
@permission_classes([AllowAny]) 
def get_django_patient_list_only(request):
    query = request.GET.get('q', '')
    try:
        limit = int(request.GET.get('limit', 50))
        start_index = int(request.GET.get('startIndex', '0'))
    except ValueError:
        limit = 50
        start_index = 0
    
    print(f"[Django View - get_django_patient_list_only] Received request. Query: '{query}', Limit: {limit}, StartIndex: {start_index}")
    try:
        base_qs = OpenMRSPatient.objects.all()
        if query:
            # UUID 검색은 정확히 일치하는 것으로 가정 (iexact 사용)
            # 다른 필드는 부분 일치 (icontains)
            try:
                # query가 유효한 UUID 형식인지 먼저 확인 시도
                uuid_query = uuid.UUID(query)
                base_qs = base_qs.filter(uuid=uuid_query)
            except ValueError:
                # UUID 형식이 아니면 다른 필드에서 검색
                base_qs = base_qs.filter(
                    Q(display_name__icontains=query) | Q(identifier__icontains=query) |
                    Q(given_name__icontains=query) | Q(family_name__icontains=query)
                )
        
        patients_qs_ordered = base_qs.order_by('display_name')
        total_patients_after_filter = patients_qs_ordered.count()
        current_patients_to_display = patients_qs_ordered[start_index : start_index + limit]
        
        print(f"[Django View - get_django_patient_list_only] Patients to display after paging: {len(list(current_patients_to_display))}")

        patients_data = []
        for p_model in current_patients_to_display:
            display_name_final = "정보 없음"; person_data_final = {}; identifiers_final = []
            if p_model.raw_openmrs_data and isinstance(p_model.raw_openmrs_data, dict):
                raw = p_model.raw_openmrs_data; display_name_final = raw.get('display', display_name_final)
                raw_ids = raw.get('identifiers', []);
                if raw_ids and isinstance(raw_ids, list):
                    for ident in raw_ids:
                        if ident and ident.get('identifier'): identifiers_final.append({'identifier': ident.get('identifier')})
                raw_person = raw.get('person', {});
                if raw_person and isinstance(raw_person, dict):
                    person_display_raw = raw_person.get('display', f"{raw_person.get('preferredName', {}).get('givenName', '')} {raw_person.get('preferredName', {}).get('familyName', '')}".strip())
                    person_data_final = {'display': person_display_raw, 'gender': raw_person.get('gender'), 'birthdate': raw_person.get('birthdate'), 'preferredName': raw_person.get('preferredName', {})}
            if display_name_final == "정보 없음": display_name_final = p_model.display_name or f"{p_model.given_name or ''} {p_model.family_name or ''}".strip() or (f"ID: {p_model.identifier}" if p_model.identifier else f"Patient (UUID: {str(p_model.uuid)[:8]})")
            if not identifiers_final and p_model.identifier: identifiers_final.append({'identifier': p_model.identifier})
            if not person_data_final or not person_data_final.get('display'): # person 정보가 raw에서 없거나 비어있으면 모델 필드 사용
                person_display_model = f"{p_model.given_name or ''} {p_model.family_name or ''}".strip()
                person_data_final = {'display': person_display_model, 'gender': p_model.gender or person_data_final.get('gender'), 'birthdate': (p_model.birthdate.isoformat() if isinstance(p_model.birthdate, date) else str(p_model.birthdate)) if p_model.birthdate else person_data_final.get('birthdate'), 'preferredName': {'givenName': p_model.given_name or person_data_final.get('preferredName', {}).get('givenName'), 'familyName': p_model.family_name or person_data_final.get('preferredName', {}).get('familyName')}}
            patients_data.append({'uuid': str(p_model.uuid), 'display': display_name_final, 'identifiers': identifiers_final, 'person': person_data_final})
        
        print(f"Django View (get_django_patient_list_only): Returning {len(patients_data)} patients. Total: {total_patients_after_filter}")
        return Response({'results': patients_data, 'totalCount': total_patients_after_filter})
    except Exception as e:
        print(f"Django View (get_django_patient_list_only): Error - {type(e).__name__}: {e}")
        return Response({'error': f'Error fetching from Django DB: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_patients_and_sync_from_openmrs(request):
    print("Django View (get_patients_and_sync_from_openmrs): Received request.")
    default_sync_query = getattr(settings, 'DEFAULT_OPENMRS_SYNC_QUERY', "1000")
    sync_query_from_request = request.GET.get('sync_q', default_sync_query) 
    sync_limit = int(request.GET.get('sync_limit', 50))
    sync_max = int(request.GET.get('sync_max', 200))
    sync_error_detail = None

    try:
        print(f"Django View (get_patients_and_sync_from_openmrs): Triggering OpenMRS sync with query='{sync_query_from_request}'")
        def view_logger(message, style_func_name=None): print(f"[SYNC_UTIL_IN_VIEW] {message}")
        perform_openmrs_patient_sync(
            query_term=sync_query_from_request, limit_per_call=sync_limit, 
            max_total_to_sync=sync_max, progress_logger=view_logger 
        )
        print(f"Django View (get_patients_and_sync_from_openmrs): Sync utility finished.")
    except Exception as e:
        sync_error_message = f"Error during OpenMRS sync: {str(e)}"
        print(f"Django View (get_patients_and_sync_from_openmrs): {sync_error_message}")
        sync_error_detail = sync_error_message
    
    query_for_list = request.GET.get('q', '') 
    limit_for_list = int(request.GET.get('limit', 50))
    start_index_for_list = int(request.GET.get('startIndex', '0'))
    print(f"Django View (get_patients_and_sync_from_openmrs): Fetching final list from LOCAL DJANGO DB. Query: '{query_for_list}'")
    try:
        base_qs = OpenMRSPatient.objects.all()
        if query_for_list:
            try: # UUID 검색 시도
                uuid_query_list = uuid.UUID(query_for_list)
                base_qs = base_qs.filter(uuid=uuid_query_list)
            except ValueError: # UUID 아니면 다른 필드 검색
                base_qs = base_qs.filter(
                    Q(display_name__icontains=query_for_list) | Q(identifier__icontains=query_for_list) |
                    Q(given_name__icontains=query_for_list) | Q(family_name__icontains=query_for_list)
                )
        patients_qs_ordered = base_qs.order_by('display_name')
        total_patients = patients_qs_ordered.count()
        patients_to_display = patients_qs_ordered[start_index_for_list : start_index_for_list + limit_for_list]
        
        patients_data_response = [] 
        for p_model in patients_to_display: # 직렬화 로직 (get_django_patient_list_only와 동일하게)
            display_name_final = "정보 없음"; person_data_final = {}; identifiers_final = []
            if p_model.raw_openmrs_data and isinstance(p_model.raw_openmrs_data, dict):
                raw = p_model.raw_openmrs_data; display_name_final = raw.get('display', display_name_final)
                raw_ids = raw.get('identifiers', []);
                if raw_ids and isinstance(raw_ids, list):
                    for ident in raw_ids:
                        if ident and ident.get('identifier'): identifiers_final.append({'identifier': ident.get('identifier')})
                raw_person = raw.get('person', {});
                if raw_person and isinstance(raw_person, dict):
                    person_display_raw = raw_person.get('display', f"{raw_person.get('preferredName', {}).get('givenName', '')} {raw_person.get('preferredName', {}).get('familyName', '')}".strip())
                    person_data_final = {'display': person_display_raw, 'gender': raw_person.get('gender'), 'birthdate': raw_person.get('birthdate'), 'preferredName': raw_person.get('preferredName', {})}
            if display_name_final == "정보 없음": display_name_final = p_model.display_name or f"{p_model.given_name or ''} {p_model.family_name or ''}".strip() or (f"ID: {p_model.identifier}" if p_model.identifier else f"Patient (UUID: {str(p_model.uuid)[:8]})")
            if not identifiers_final and p_model.identifier: identifiers_final.append({'identifier': p_model.identifier})
            if not person_data_final or not person_data_final.get('display'):
                person_display_model = f"{p_model.given_name or ''} {p_model.family_name or ''}".strip()
                person_data_final = {'display': person_display_model, 'gender': p_model.gender or person_data_final.get('gender'), 'birthdate': (p_model.birthdate.isoformat() if isinstance(p_model.birthdate, date) else str(p_model.birthdate)) if p_model.birthdate else person_data_final.get('birthdate'), 'preferredName': {'givenName': p_model.given_name or person_data_final.get('preferredName', {}).get('givenName'), 'familyName': p_model.family_name or person_data_final.get('preferredName', {}).get('familyName')}}
            patients_data_response.append({'uuid': str(p_model.uuid), 'display': display_name_final, 'identifiers': identifiers_final, 'person': person_data_final})

        response_payload = {'results': patients_data_response, 'totalCount': total_patients}
        if sync_error_detail: response_payload['sync_error_detail'] = sync_error_detail
        return Response(response_payload)
    except Exception as e:
        print(f"Django View (get_patients_and_sync_from_openmrs): Error fetching from local DB after sync: {e}")
        return Response({'error': f'Error fetching list from Django DB: {str(e)}', 'sync_error_detail': sync_error_detail}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_patient_in_openmrs_and_django(request):
    print("[Django View - create_patient_in_openmrs_and_django] Received request to create patient.")
    data = request.data
    
    if not DEFAULT_IDENTIFIER_TYPE_UUID or not DEFAULT_LOCATION_UUID:
        print("CRITICAL Django Setting ERROR: DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID or DEFAULT_OPENMRS_LOCATION_UUID is not correctly configured in settings.py.")
        return Response({'error': 'Server configuration error for OpenMRS identifiers. Please contact admin.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        given_name = data.get('givenName'); family_name = data.get('familyName'); gender = data.get('gender')
        birthdate_str = data.get('birthdate') 
        # React 폼에서 Identifier 입력을 받지 않으므로, 여기서도 identifier_value를 사용하지 않음
        # identifier_value = data.get('identifier') # 이 라인 주석 처리 또는 삭제
        
        address1 = data.get('address1', ''); city_village = data.get('cityVillage', ''); phone_number_str = data.get('phoneNumber', '')

        # 필수 필드 검증 (Identifier 제외, OpenMRS가 자동 생성 가정)
        if not (given_name and family_name and gender and birthdate_str):
            return Response({'error': 'Missing required fields (givenName, familyName, gender, birthdate)'}, status=status.HTTP_400_BAD_REQUEST)

        openmrs_payload = {
            "person": {"names": [{"givenName": given_name, "familyName": family_name, "preferred": True}],"gender": gender, "birthdate": birthdate_str, 
                       "addresses": [{"address1": address1, "cityVillage": city_village, "preferred": True}] if address1 or city_village else [],
                       "attributes": []},
            "identifiers": [{ # OpenMRS가 ID를 자동 생성하더라도, 어떤 타입의 ID를 생성할지 알려주기 위해 필요할 수 있음
                # "identifier": "이 필드를 보내지 않음", <--- 주석 처리 또는 제거
                "identifierType": DEFAULT_IDENTIFIER_TYPE_UUID, 
                "location": DEFAULT_LOCATION_UUID, 
                "preferred": True 
            }]
        }
        
        if phone_number_str and PHONE_NUMBER_ATTRIBUTE_TYPE_UUID:
            openmrs_payload["person"]["attributes"].append({
                "attributeType": PHONE_NUMBER_ATTRIBUTE_TYPE_UUID, "value": phone_number_str
            })
        
        api_url = f"{OPENMRS_API_BASE_URL}/patient"
        print(f"Django View: Posting to OpenMRS API: {api_url} with payload: {json.dumps(openmrs_payload, indent=2)}")
        omrs_response = requests.post(
            api_url, json=openmrs_payload, auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD),
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, timeout=15
        )
        omrs_response.raise_for_status()
        created_openmrs_patient_data = omrs_response.json()
        print(f"Django View: Successfully created patient in OpenMRS: {created_openmrs_patient_data.get('uuid')}")
        
        # Django DB 저장 로직
        try:
            new_patient_uuid = uuid.UUID(created_openmrs_patient_data.get('uuid'))
            resp_identifiers = created_openmrs_patient_data.get('identifiers', [])
            resp_main_identifier = resp_identifiers[0].get('identifier') if resp_identifiers and len(resp_identifiers) > 0 and resp_identifiers[0] else None
            resp_person_data = created_openmrs_patient_data.get('person', {});
            if not resp_person_data: resp_person_data = {}
            resp_preferred_name = resp_person_data.get('preferredName', {});
            if not resp_preferred_name: resp_preferred_name = {}
            resp_birthdate_str = resp_person_data.get('birthdate'); birthdate_obj_for_db = None
            if resp_birthdate_str:
                try: birthdate_obj_for_db = datetime.fromisoformat(resp_birthdate_str.replace("Z", "+00:00")).date()
                except ValueError:
                    try: birthdate_obj_for_db = datetime.strptime(resp_birthdate_str.split('T')[0], '%Y-%m-%d').date()
                    except ValueError: birthdate_obj_for_db = None
            
            OpenMRSPatient.objects.update_or_create(
                uuid=new_patient_uuid,
                defaults={
                    'display_name': created_openmrs_patient_data.get('display'), 
                    'identifier': resp_main_identifier, 
                    'given_name': resp_preferred_name.get('givenName'), 
                    'family_name': resp_preferred_name.get('familyName'),
                    'gender': resp_person_data.get('gender'), 
                    'birthdate': birthdate_obj_for_db,
                    'raw_openmrs_data': created_openmrs_patient_data
                }
            )
        except Exception as db_error:
            print(f"Django View: Error saving created OpenMRS patient to Django DB: {db_error}")
        return Response(created_openmrs_patient_data, status=status.HTTP_201_CREATED)
    except requests.exceptions.HTTPError as err:
        error_message = f'Failed to create patient in OpenMRS: {err.response.status if err.response else "Unknown"} {err.response.reason if err.response else "Unknown"}'
        error_detail_text = err.response.text if err.response else "No details from OpenMRS"
        print(f"Django View: HTTP error creating patient in OpenMRS: {err} - Detail: {error_detail_text}")
        return Response({'error': error_message, 'detail': error_detail_text}, status=err.response.status_code if err.response else status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        print(f"Django View: Unexpected error in create_patient_in_openmrs_and_django: {type(e).__name__} - {e}")
        return Response({'error': f'An unexpected server error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_openmrs_patient_detail(request, patient_uuid):
    # ... (이전 답변의 get_openmrs_patient_detail 전체 코드와 동일하게 유지) ...
    try:
        valid_uuid = uuid.UUID(str(patient_uuid))
        try:
            patient_model_instance = OpenMRSPatient.objects.get(uuid=valid_uuid)
            if patient_model_instance.raw_openmrs_data and isinstance(patient_model_instance.raw_openmrs_data, dict):
                print(f"Django View (get_openmrs_patient_detail): Fetching patient {valid_uuid} from Django DB (using existing raw_openmrs_data)")
                return Response(patient_model_instance.raw_openmrs_data)
            print(f"Django View (get_openmrs_patient_detail): Patient {valid_uuid} found in Django DB but raw_openmrs_data is missing or invalid, will fetch fresh from OpenMRS...")
        except OpenMRSPatient.DoesNotExist:
            print(f"Django View (get_openmrs_patient_detail): Patient {valid_uuid} not found in Django DB, will fetch from OpenMRS...")

        api_url = f"{OPENMRS_API_BASE_URL}/patient/{valid_uuid}?v=full"
        print(f"Django View (get_openmrs_patient_detail): Requesting OpenMRS API: {api_url}")
        
        response_from_omrs = requests.get(
            api_url, auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD),
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, timeout=10
        )
        response_from_omrs.raise_for_status() 
        openmrs_patient_data = response_from_omrs.json()
        print(f"Django View (get_openmrs_patient_detail): Successfully fetched data from OpenMRS for patient {valid_uuid}")

        try:
            identifiers = openmrs_patient_data.get('identifiers', [])
            main_identifier = identifiers[0].get('identifier') if identifiers and len(identifiers) > 0 and identifiers[0] else None
            person_data = openmrs_patient_data.get('person', {})
            if not person_data: person_data = {}
            preferred_name = person_data.get('preferredName', {})
            if not preferred_name: preferred_name = {}
            birthdate_str = person_data.get('birthdate') 
            birthdate_obj = None
            if birthdate_str:
                try: birthdate_obj = datetime.fromisoformat(birthdate_str.replace("Z", "+00:00")).date()
                except ValueError:
                    try: birthdate_obj = datetime.strptime(birthdate_str.split('T')[0], '%Y-%m-%d').date()
                    except ValueError: birthdate_obj = None
            
            OpenMRSPatient.objects.update_or_create(
                uuid=valid_uuid,
                defaults={
                    'display_name': openmrs_patient_data.get('display'), 'identifier': main_identifier,
                    'given_name': preferred_name.get('givenName'), 'family_name': preferred_name.get('familyName'),
                    'gender': person_data.get('gender'), 'birthdate': birthdate_obj, 
                    'raw_openmrs_data': openmrs_patient_data
                }
            )
        except Exception as db_error:
            print(f"Django View (get_openmrs_patient_detail): Error saving/updating patient {valid_uuid} to Django DB: {type(db_error).__name__} - {db_error}")
        return Response(openmrs_patient_data)
    except ValueError: 
        return Response({'error': 'Invalid UUID format provided.'}, status=status.HTTP_400_BAD_REQUEST)
    except requests.exceptions.HTTPError as err:
        if err.response and err.response.status_code == 404:
            return Response({'error': f'Patient (UUID: {patient_uuid}) not found in OpenMRS.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            error_message = f'Error fetching detail from OpenMRS: {err.response.status if err.response else "Unknown Status"} {err.response.reason if err.response else "Unknown Reason"}'
            error_detail_text = err.response.text if err.response else 'No response text from OpenMRS'
            print(f"Django View (get_openmrs_patient_detail): HTTP error - {err} - Detail (first 500 chars): {error_detail_text[:500]}")
            return Response({'error': error_message, 'detail': error_detail_text}, status=err.response.status_code if err.response else status.HTTP_500_INTERNAL_SERVER_ERROR)
    except requests.exceptions.RequestException as err:
        print(f"Django View (get_openmrs_patient_detail): Network error - {err}")
        return Response({'error': f'Network error connecting to OpenMRS: {str(err)}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        print(f"Django View (get_openmrs_patient_detail): Unexpected error - {type(e).__name__}: {e}")
        return Response({'error': f'An unexpected server error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
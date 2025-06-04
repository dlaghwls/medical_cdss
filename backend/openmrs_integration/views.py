# openmrs_integration/views.py
import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
from .models import OpenMRSPatient
from django.db.models import Q
import uuid
from datetime import datetime, date
import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .utils import perform_openmrs_patient_sync

# Docker 환경에 맞는 OpenMRS 설정
OPENMRS_API_BASE_URL = getattr(settings, 'OPENMRS_API_BASE_URL', 'http://openmrs-backend-app:8080/openmrs/ws/rest/v1')
OPENMRS_USERNAME = getattr(settings, 'OPENMRS_USERNAME', 'admin')
OPENMRS_PASSWORD = getattr(settings, 'OPENMRS_PASSWORD', 'Admin123')

DEFAULT_IDENTIFIER_TYPE_UUID = getattr(settings, 'DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID', None)
DEFAULT_LOCATION_UUID = getattr(settings, 'DEFAULT_OPENMRS_LOCATION_UUID', None)
PHONE_NUMBER_ATTRIBUTE_TYPE_UUID = getattr(settings, 'OPENMRS_PHONE_ATTRIBUTE_TYPE_UUID', None)

def is_openmrs_uuid_valid(resource_type, uuid_to_check):
    """Helper function to check if a UUID exists in OpenMRS for a given resource type."""
    if not uuid_to_check:
        print(f"UUID validation: {resource_type} UUID is None or empty.")
        return False
    url = f"{OPENMRS_API_BASE_URL}/{resource_type}/{uuid_to_check}"
    log_prefix = f"[Django View - UUID Check for {resource_type} {uuid_to_check}]"
    try:
        print(f"{log_prefix} Requesting OpenMRS API: {url}")
        response = requests.get(url, auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD), timeout=10)
        print(f"{log_prefix} Response status: {response.status_code}")
        return response.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"{log_prefix} Error: {e}")
        return False

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
            print(f"[Django View - get_django_patient_list_only] Applying filter for query: '{query}'")
            try:
                uuid_query = uuid.UUID(query)
                base_qs = base_qs.filter(uuid=uuid_query)
            except ValueError:
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
            if not person_data_final or not person_data_final.get('display'):
                person_display_model = f"{p_model.given_name or ''} {p_model.family_name or ''}".strip()
                person_data_final = {'display': person_display_model, 'gender': p_model.gender or person_data_final.get('gender'), 'birthdate': (p_model.birthdate.isoformat() if isinstance(p_model.birthdate, date) else str(p_model.birthdate)) if p_model.birthdate else person_data_final.get('birthdate'), 'preferredName': {'givenName': p_model.given_name or person_data_final.get('preferredName', {}).get('givenName'), 'familyName': p_model.family_name or person_data_final.get('preferredName', {}).get('familyName')}}
            patients_data.append({'uuid': str(p_model.uuid), 'display': display_name_final, 'identifiers': identifiers_final, 'person': person_data_final})

        print(f"Django View (get_django_patient_list_only): Returning {len(patients_data)} patients. Total: {total_patients_after_filter}")
        return Response({'results': patients_data, 'totalCount': total_patients_after_filter})
    except Exception as e:
        print(f"Django View (get_django_patient_list_only): Error - {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
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
            try:
                uuid_query_list = uuid.UUID(query_for_list)
                base_qs = base_qs.filter(uuid=uuid_query_list)
            except ValueError:
                base_qs = base_qs.filter(
                    Q(display_name__icontains=query_for_list) | Q(identifier__icontains=query_for_list) |
                    Q(given_name__icontains=query_for_list) | Q(family_name__icontains=query_for_list)
                )
        patients_qs_ordered = base_qs.order_by('display_name')
        total_patients = patients_qs_ordered.count()
        patients_to_display = patients_qs_ordered[start_index_for_list : start_index_for_list + limit_for_list]

        patients_data_response = []
        for p_model in patients_to_display:
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
    print(f"[Django View - create_patient_in_openmrs_and_django] Received request data: {request.data}")
    data = request.data

    identifier_type_uuid_from_settings = DEFAULT_IDENTIFIER_TYPE_UUID
    location_uuid_from_settings = DEFAULT_LOCATION_UUID
    phone_attr_type_uuid_from_settings = PHONE_NUMBER_ATTRIBUTE_TYPE_UUID

    # --- UUID 유효성 사전 확인 ---
    if not identifier_type_uuid_from_settings or \
       not is_openmrs_uuid_valid('patientidentifiertype', identifier_type_uuid_from_settings):
        error_msg = "Configuration Error: DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID in settings is invalid, not found in OpenMRS, or OpenMRS API is not reachable."
        print(f"CRITICAL ERROR: {error_msg}")
        return Response({'error': error_msg, 'detail': 'Please check server logs and OpenMRS configuration.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if not location_uuid_from_settings or \
       not is_openmrs_uuid_valid('location', location_uuid_from_settings):
        error_msg = "Configuration Error: DEFAULT_OPENMRS_LOCATION_UUID in settings is invalid, not found in OpenMRS, or OpenMRS API is not reachable."
        print(f"CRITICAL ERROR: {error_msg}")
        return Response({'error': error_msg, 'detail': 'Please check server logs and OpenMRS configuration.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if data.get('phoneNumber') and phone_attr_type_uuid_from_settings and \
       not is_openmrs_uuid_valid('personattributetype', phone_attr_type_uuid_from_settings):
        error_msg = "Configuration Error: OPENMRS_PHONE_ATTRIBUTE_TYPE_UUID in settings is invalid, not found in OpenMRS, or OpenMRS API is not reachable."
        print(f"CRITICAL ERROR: {error_msg}")
        return Response({'error': error_msg, 'detail': 'Please check server logs and OpenMRS configuration.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        given_name = data.get('givenName')
        family_name = data.get('familyName')
        gender = data.get('gender')
        birthdate_str = data.get('birthdate')
        identifier_value = data.get('identifier') # React에서 받은 Identifier 값

        address1 = data.get('address1', '')
        city_village = data.get('cityVillage', '')
        phone_number_str = data.get('phoneNumber', '')

        if not (given_name and family_name and gender and birthdate_str and identifier_value):
            return Response({'error': 'Missing required fields (givenName, familyName, gender, birthdate, identifier)'}, status=status.HTTP_400_BAD_REQUEST)

        openmrs_payload = {
            "person": {
                "names": [{"givenName": given_name, "familyName": family_name, "preferred": True}],
                "gender": gender,
                "birthdate": birthdate_str,
                "addresses": [{"address1": address1, "cityVillage": city_village, "preferred": True}] if address1 or city_village else [],
                "attributes": []
            },
            "identifiers": [{
                "identifier": identifier_value,
                "identifierType": identifier_type_uuid_from_settings,
                "location": location_uuid_from_settings,
                "preferred": True
            }]
        }

        if phone_number_str and phone_attr_type_uuid_from_settings:
            openmrs_payload["person"]["attributes"].append({
                "attributeType": phone_attr_type_uuid_from_settings, "value": phone_number_str
            })
        
        api_url = f"{OPENMRS_API_BASE_URL}/patient"
        print(f"Django View: Posting to OpenMRS API: {api_url} with payload: {json.dumps(openmrs_payload, indent=2)}")

        omrs_response = requests.post(
            api_url, json=openmrs_payload, auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD),
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, timeout=20
        )
        
        print(f"Django View: OpenMRS API response status for patient creation: {omrs_response.status_code}")
        print(f"Django View: OpenMRS API response text for patient creation (first 1000 chars): {omrs_response.text[:1000]}")
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
                    except ValueError: 
                        print(f"Warning: Could not parse birthdate '{resp_birthdate_str}' from OpenMRS response for DB save.")
                        birthdate_obj_for_db = None
            
            patient_obj, created_in_django = OpenMRSPatient.objects.update_or_create(
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
            log_action = "CREATED" if created_in_django else "UPDATED"
            print(f"Django View: Patient {new_patient_uuid} {log_action} in Django DB.")
        except Exception as db_error:
            print(f"Django View: Error saving created OpenMRS patient ({created_openmrs_patient_data.get('uuid')}) to Django DB: {type(db_error).__name__} - {db_error}")
        
        return Response(created_openmrs_patient_data, status=status.HTTP_201_CREATED)

    except requests.exceptions.HTTPError as err:
        error_message = f'Failed to create patient in OpenMRS (HTTP Error)'
        error_detail_text = "No details from OpenMRS or error in parsing response." 
        response_status_code = status.HTTP_500_INTERNAL_SERVER_ERROR 
        if err.response is not None:
            error_message = f'Failed to create patient in OpenMRS: {err.response.status_code} {err.response.reason}'
            error_detail_text = err.response.text 
            response_status_code = err.response.status_code
        print(f"Django View: HTTP error creating patient in OpenMRS. Status: {response_status_code}. Error Obj: {err}. Full Response Text: {error_detail_text}")
        return Response({'error': error_message, 'detail': error_detail_text[:1000]}, status=response_status_code)
    
    except requests.exceptions.JSONDecodeError as json_err: 
        error_message = 'Failed to parse OpenMRS response as JSON after patient creation attempt.'
        response_text_sample = ""
        if 'omrs_response' in locals() and hasattr(omrs_response, 'text'):
            response_text_sample = omrs_response.text[:1000]
        print(f"Django View: JSONDecodeError - {json_err}. OpenMRS response status: {omrs_response.status_code if 'omrs_response' in locals() else 'N/A'}. Response text sample: {response_text_sample}")
        return Response({'error': error_message, 'detail': f"OpenMRS status: {omrs_response.status_code if 'omrs_response' in locals() else 'N/A'}. Response might not be JSON. Sample: {response_text_sample}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except requests.exceptions.RequestException as req_err: 
        print(f"Django View: Network error or other RequestException connecting to OpenMRS for patient creation: {req_err}")
        return Response({'error': f'Network error connecting to OpenMRS: {str(req_err)}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
    except Exception as e: 
        print(f"Django View: Unexpected error in create_patient_in_openmrs_and_django: {type(e).__name__} - {e}")
        return Response({'error': f'An unexpected server error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_openmrs_patient_detail(request, patient_uuid):
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

        # Django DB 저장 로직
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
    except requests.exceptions.RequestException as req_err:
        print(f"Django View (get_openmrs_patient_detail): Network error - {err}")
        return Response({'error': f'Network error connecting to OpenMRS: {str(req_err)}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        print(f"Django View (get_openmrs_patient_detail): Unexpected error - {type(e).__name__}: {e}")
        return Response({'error': f'An unexpected server error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
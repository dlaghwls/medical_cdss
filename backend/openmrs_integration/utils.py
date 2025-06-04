# openmrs_integration/utils.py
from django.conf import settings
import requests
from requests.auth import HTTPBasicAuth
import uuid
from .models import OpenMRSPatient 
from datetime import datetime

OPENMRS_API_BASE_URL = getattr(settings, 'OPENMRS_API_BASE_URL', 'http://localhost:8080/openmrs/ws/rest/v1')
OPENMRS_USERNAME = getattr(settings, 'OPENMRS_USERNAME', 'admin')
OPENMRS_PASSWORD = getattr(settings, 'OPENMRS_PASSWORD', 'Admin123')

def perform_openmrs_patient_sync(query_term="1000", limit_per_call=50, max_total_to_sync=1000, progress_logger=None):
    if progress_logger is None:
        def default_logger(message, style_func_name=None):
            print(message)
        progress_logger = default_logger

    progress_logger(f"SYNC UTILITY: Starting sync from OpenMRS with query='{query_term}', limit_per_call={limit_per_call}, max_total_to_sync={max_total_to_sync}", 'INFO')

    synced_count = 0
    start_index = 0
    has_more_patients = True

    while has_more_patients and synced_count < max_total_to_sync:
        try:
            api_url = f"{OPENMRS_API_BASE_URL}/patient"
            params = {
                'v': 'full',
                'limit': limit_per_call,
                'startIndex': start_index,
            }
            # query_term이 None이 아니고 빈 문자열도 아닐 때만 q 파라미터 추가
            # OpenMRS가 빈 q 또는 q 없는 조회를 어떻게 처리하는지 확인 필요
            if query_term: 
                params['q'] = query_term
            
            progress_logger(f"SYNC UTILITY: Requesting OpenMRS API - URL: {api_url}, Params: {params}", 'INFO')
            
            response = requests.get(
                api_url, params=params, auth=HTTPBasicAuth(OPENMRS_USERNAME, OPENMRS_PASSWORD),
                headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, timeout=60
            )
            progress_logger(f"SYNC UTILITY: OpenMRS API response status: {response.status_code}", 'INFO')
            response.raise_for_status()
            
            openmrs_response_data = response.json()
            openmrs_patients_list = openmrs_response_data.get('results', [])

            if not openmrs_patients_list:
                has_more_patients = False
                log_msg = f"No patients found in OpenMRS for query '{query_term}'"
                if start_index == 0: log_msg += " on the first page."
                else: log_msg += " on subsequent pages."
                progress_logger(log_msg, 'WARNING')
                break

            progress_logger(f"SYNC UTILITY: Fetched {len(openmrs_patients_list)} patients. Processing (current synced: {synced_count}, startIndex: {start_index})...", 'INFO')

            for patient_data in openmrs_patients_list:
                try:
                    patient_uuid_str = patient_data.get('uuid')
                    if not patient_uuid_str:
                        progress_logger(f"SYNC UTILITY: Skipping patient data with no UUID: {patient_data.get('display')}", 'WARNING')
                        continue
                    valid_uuid = uuid.UUID(patient_uuid_str)
                    identifiers = patient_data.get('identifiers', [])
                    main_identifier = identifiers[0].get('identifier') if identifiers and len(identifiers) > 0 and identifiers[0] else None
                    person_data = patient_data.get('person', {})
                    if not person_data: person_data = {}
                    preferred_name = person_data.get('preferredName', {})
                    if not preferred_name: preferred_name = {}
                    birthdate_str = person_data.get('birthdate') # person 객체 안의 birthdate
                    birthdate_obj = None
                    if birthdate_str:
                        try:
                            birthdate_obj = datetime.fromisoformat(birthdate_str.replace("Z", "+00:00")).date()
                        except ValueError:
                            try:
                                birthdate_obj = datetime.strptime(birthdate_str.split('T')[0], '%Y-%m-%d').date()
                            except ValueError:
                                progress_logger(f"SYNC UTILITY: Could not parse birthdate: {birthdate_str} for patient {valid_uuid}", 'WARNING')
                                birthdate_obj = None
                    
                    obj, created = OpenMRSPatient.objects.update_or_create(
                        uuid=valid_uuid,
                        defaults={
                            'display_name': patient_data.get('display'),
                            'identifier': main_identifier,
                            'given_name': preferred_name.get('givenName'),
                            'family_name': preferred_name.get('familyName'),
                            'gender': person_data.get('gender'),
                            'birthdate': birthdate_obj,
                            'raw_openmrs_data': patient_data
                        }
                    )
                    log_prefix = "CREATED" if created else "UPDATED"
                    progress_logger(f"SYNC UTILITY: {log_prefix}: Patient {valid_uuid} - {patient_data.get('display')}", 'SUCCESS' if created else 'INFO')
                    
                    synced_count += 1
                    if synced_count >= max_total_to_sync:
                        has_more_patients = False
                        progress_logger(f"SYNC UTILITY: Reached max_patients limit: {max_total_to_sync}", 'WARNING')
                        break
                except Exception as db_error:
                    progress_logger(f"SYNC UTILITY: Error saving/updating patient {patient_data.get('uuid')} to Django DB: {type(db_error).__name__} - {db_error}", 'ERROR')

            if not has_more_patients: break
            start_index += len(openmrs_patients_list)
            if len(openmrs_patients_list) < limit_per_call:
                has_more_patients = False
                progress_logger(f"SYNC UTILITY: Fetched all available patients for query '{query_term}'.", 'SUCCESS')

        except requests.exceptions.HTTPError as err:
            error_detail = err.response.text if err.response is not None else "No response text"
            status_code = err.response.status_code if err.response is not None else "Unknown"
            reason = err.response.reason if err.response is not None else "Unknown"
            progress_logger(f"SYNC UTILITY: HTTP error - {status_code} {reason}. Detail: {error_detail[:200]}...", 'ERROR')
            has_more_patients = False
        except requests.exceptions.JSONDecodeError as err_json:
            raw_text = response.text[:200] if 'response' in locals() and hasattr(response, 'text') else 'N/A'
            progress_logger(f"SYNC UTILITY: JSONDecodeError - {err_json}. Raw text: {raw_text}...", 'ERROR')
            has_more_patients = False
        except requests.exceptions.RequestException as err:
            progress_logger(f"SYNC UTILITY: Network error - {err}", 'ERROR')
            has_more_patients = False
        except Exception as e:
            progress_logger(f"SYNC UTILITY: Unexpected error - {type(e).__name__}: {e}", 'ERROR')
            has_more_patients = False

    progress_logger(f"SYNC UTILITY: Finished. Total patients processed/synced: {synced_count}", 'SUCCESS')
    return synced_count
import { supabase } from '../../lib/supabase';
import type { ProfileSettings, VisionPassport } from './types';

export async function getVisionPassport(organizationId:string) {
  const {data,error}=await supabase.rpc('get_employee_vision_passport',{target_organization_id:organizationId});
  if(error) throw error; return data as VisionPassport;
}
export async function getProfileSettings(organizationId:string) {
  const {data,error}=await supabase.rpc('get_employee_profile_settings',{target_organization_id:organizationId});
  if(error) throw error; return data as ProfileSettings;
}
export async function updateProfileSettings(organizationId:string,settings:Partial<ProfileSettings>) {
  const {data,error}=await supabase.rpc('update_employee_profile_settings',{target_organization_id:organizationId,settings});
  if(error) throw error; return data as ProfileSettings;
}
export async function setConsent(organizationId:string,type:string,granted:boolean,providerOrganizationId:string|null=null) {
  const {error}=await supabase.rpc('set_employee_consent',{target_organization_id:organizationId,target_consent_type:type,target_granted:granted,target_provider_organization_id:providerOrganizationId});
  if(error) throw error;
}
export async function exportEmployeeData(organizationId:string){const {data,error}=await supabase.rpc('export_employee_data',{target_organization_id:organizationId});if(error)throw error;return data}
export async function requestDataDeletion(organizationId:string){const {data,error}=await supabase.rpc('request_employee_data_deletion',{target_organization_id:organizationId});if(error)throw error;return data}
export async function cancelDataDeletion(organizationId:string,requestId:string){const {data,error}=await supabase.rpc('cancel_employee_data_deletion',{target_organization_id:organizationId,target_request_id:requestId});if(error)throw error;return data}
export async function getDataDeletionStatus(organizationId:string,requestId:string){const {data,error}=await supabase.rpc('get_employee_data_deletion_status',{target_organization_id:organizationId,target_request_id:requestId});if(error)throw error;return data}
export async function getClinicDocumentUrl(storagePath:string){const {data,error}=await supabase.storage.from('clinic-documents').createSignedUrl(storagePath,60);if(error)throw error;return data.signedUrl}
export async function getClinicDocumentDownloadUrl(storagePath:string,fileName:string){const {data,error}=await supabase.storage.from('clinic-documents').createSignedUrl(storagePath,60,{download:fileName});if(error)throw error;return data.signedUrl}

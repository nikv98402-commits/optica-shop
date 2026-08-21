export interface PassportScreening { id:string; completedAt:string; outcome:'routine'|'review_recommended'|'urgent'; reviewWithinDays:number }
export type ReferralStatus = 'created';
export type RecommendationStatus = 'active'|'completed'|'dismissed';
export type RecommendationKey = 'review.annual'|'comfort.breaks'|'exam.follow_up';
export type DocumentType = 'visit_summary'|'prescription'|'care_plan';
export type DeletionStatus = 'requested'|'processing'|'completed'|'cancelled'|'failed';
export interface PassportReferral { id:string; status:ReferralStatus; priority:'review_recommended'|'urgent'; respondBy:string; createdAt:string }
export interface PassportRecommendation { id:string; titleKey:RecommendationKey; status:RecommendationStatus; dueAt:string|null }
export interface PassportDocument { id:string; type:DocumentType; title:string; storagePath:string; issuedAt:string }
export interface VisionPassport { screenings:PassportScreening[]; referrals:PassportReferral[]; recommendations:PassportRecommendation[]; documents:PassportDocument[]; nextReviewAt:string|null }
export interface ProfileSettings { displayName:string; locale:'ru'|'en'; region:string|null; phone:string|null; birthDate:string|null; notificationEmail:boolean; notificationPush:boolean; organizationName:string; consents:{type:'program_participation'|'clinic_access'|'research';granted:boolean;providerOrganizationId:string|null;providerName:string|null}[]; providers:{id:string;name:string}[]; devices:{id:string;label:string;lastSeenAt:string;current:boolean}[]; deletionRequest:{id:string;status:DeletionStatus;requestedAt:string;processedAt:string|null}|null }

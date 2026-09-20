export type ResidenceCategory = 'individual_house' | 'apartment' | 'gated_society';

export type DeliveryStatus = 
  | 'CREATED'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'ARRIVING'
  | 'AT_LOCATION'
  | 'ATTEMPT_SUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REVIEW'
  | 'DELIVERED'
  | 'CUSTOMER_CONFIRMED_FAILURE'
  | 'RETRY_REQUIRED';

export type FailureReason = 
  | 'customer_unavailable'
  | 'gate_locked_security_refusal'
  | 'incorrect_address'
  | 'customer_rejected_delivery'
  | 'access_code_required'
  | 'other';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  preferredLanguage?: string;
}

export interface Address {
  street: string;
  unitOrFlat?: string;
  landmark?: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  residenceCategory: ResidenceCategory;
}

export interface Delivery {
  id: string;
  trackingNumber: string;
  customer: Customer;
  address: Address;
  packageDescription: string;
  estimatedDeliveryWindow: string;
  status: DeliveryStatus;
  createdAt: string;
  assignedDriverId: string;
  notes?: string;
  videoProofUri?: string;
  requiresAdminApproval?: boolean;
  adminApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  auditId?: string;
  currentAttemptId?: string;
  requiresCustomerConfirmation?: boolean;
  completedAt?: string;
  handoffType?: 'direct' | 'doorstep' | 'security';
  retryRequired?: boolean;
  customerResponse?: 'PACKAGE_RECEIVED' | 'PACKAGE_NOT_RECEIVED' | string;
  customerResponseAt?: string;
  customerResponseSource?: string;
  verificationUrl?: string;
  verificationToken?: string;
  qrExpiresAt?: string;
  qrStatus?: 'ACTIVE' | 'SCANNED' | 'CONSUMED' | 'EXPIRED';
  auditTimeline?: Array<{
    timestamp: string;
    event: string;
    description: string;
  }>;
}

export interface ShiftMetrics {
  totalDeliveries: number;
  completed: number;
  verifiedAttempts: number;
  rejectedAttempts: number;
  reviewAttempts: number;
}

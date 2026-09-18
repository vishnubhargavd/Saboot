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
  | 'DELIVERED';

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
  completedAt?: string;
  handoffType?: 'direct' | 'doorstep' | 'security';
}

export interface ShiftMetrics {
  totalDeliveries: number;
  completed: number;
  verifiedAttempts: number;
  rejectedAttempts: number;
  reviewAttempts: number;
}

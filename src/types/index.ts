export type InspectionStatus =
  | "draft"
  | "uploading"
  | "initiated"
  | "in_progress"
  | "completed"
  | "failed";

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UploadedImage {
  id: number;
  angle: string;
  original_filename: string;
  public_url: string;
  content_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  camcom_upload_status: string | null;
  created_at: string;
}

export interface RoiImage {
  id: number;
  angle: string | null;
  label: string | null;
  image_url: string;
  description: string | null;
  created_at: string;
}

export interface Assessment {
  id: number;
  part_name: string;
  action: string | null;
  dam_type: string | null;
  intensity: string | null;
  confidence: number | null;
  pictures: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface Inspection {
  id: number;
  ref_num: string;
  vehicle_number: string;
  customer_name: string;
  vehicle_model: string;
  notes: string | null;
  status: InspectionStatus;
  camcom_status_code: number | null;
  camcom_inspection_url: string | null;
  reviewer_info: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface InspectionDetail extends Inspection {
  uploaded_images: UploadedImage[];
  roi_images: RoiImage[];
  assessments: Assessment[];
}

export interface InspectionListResponse {
  items: Inspection[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  total: number;
  draft: number;
  initiated: number;
  in_progress: number;
  completed: number;
  failed: number;
  recent: Inspection[];
}

export const VEHICLE_ANGLES: { slug: string; label: string; group: "exterior" | "details" }[] = [
  { slug: "front", label: "Front", group: "exterior" },
  { slug: "front_left", label: "Front Left", group: "exterior" },
  { slug: "front_right", label: "Front Right", group: "exterior" },
  { slug: "left", label: "Left", group: "exterior" },
  { slug: "rear", label: "Rear", group: "exterior" },
  { slug: "rear_left", label: "Rear Left", group: "exterior" },
  { slug: "rear_right", label: "Rear Right", group: "exterior" },
  { slug: "right", label: "Right", group: "exterior" },
  { slug: "windshield", label: "Windshield", group: "details" },
  { slug: "chassis_vin", label: "Chassis / VIN", group: "details" },
  { slug: "odometer", label: "Odometer", group: "details" },
];

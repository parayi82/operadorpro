export interface User {
  id: string;
  email: string;
  full_name?: string;
  rfc?: string;
  phone?: string;
  avatar_url?: string;
}

export interface Unit {
  id: string;
  user_id: string;
  name: string;
  placa: string;
  config_vehicular?: string;
  anio_modelo?: number;
  vin?: string;
  active: boolean;
  created_at: string;
}

export interface CartaPorte {
  id: string;
  user_id: string;
  folio: string;
  remitente_id?: string;
  destinatario_id?: string;
  vehicle_id?: string;
  status: 'draft' | 'completed' | 'canceled';
  total_weight?: number;
  total_value?: number;
  qr_data?: string;
  pdf_url?: string;
  created_at: string;
}

export interface Inspection {
  id: string;
  user_id: string;
  unit_id: string;
  status: 'pending' | 'completed' | 'failed';
  checklist: Record<string, boolean | string>;
  location?: { lat: number; lng: number };
  signature_url?: string;
  pdf_url?: string;
  completed_at?: string;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  client_id?: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
  message?: string;
  whatsapp_sent: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface UserCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  completed_at?: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  public_id: string;
  issued_at: string;
  pdf_url?: string;
}

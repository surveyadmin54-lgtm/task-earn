export type UserRole = 'user' | 'admin'
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected'
export type AccountStatus = 'active' | 'suspended'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: AccountStatus
  points: number
  phone?: string
  payment_info?: string
  referral_code?: string
  referred_by?: string
  referral_rewarded?: boolean
  last_checkin?: string
  level: number
  approved: boolean
  created_at: string
}

export interface Survey {
  id: string
  title: string
  description: string
  points_reward: number
  is_active: boolean
  resets_daily: boolean
  expires_at?: string
  min_level?: number
  max_level?: number
  target_user_ids?: string[]
  created_at: string
  questions?: Question[]
}

export interface Question {
  id: string
  survey_id: string
  text: string
  options: string[]   // ['__open__'] for open-ended, otherwise array of choices
  order: number
}

export interface SurveyResponse {
  id: string
  user_id: string
  survey_id: string
  answers: Record<string, string>  // question_id → selected option or text
  completed_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount_points: number
  payment_method: string
  payment_details: string
  status: WithdrawalStatus
  admin_note?: string
  created_at: string
  profiles?: Profile
}

export interface PointTransaction {
  id: string
  user_id: string
  amount: number
  type: 'earn' | 'redeem'
  description: string
  created_at: string
}

export interface GiftCard {
  id: string
  code: string
  points_value: number
  is_redeemed: boolean
  redeemed_by?: string
  redeemed_at?: string
  created_at: string
  note?: string
}

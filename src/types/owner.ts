export interface Owner {
  id: string
  f_name: string
  l_name: string
  mobile_number: number
  national_code: number
  username: string
  address: string
  role_name: 'owner'
  balance: number
  is_active: boolean
  created_at: string
  latitude: number
  longitude: number
  birthday: string
  email: string
  iban?: string
  venues: Venue[]
  events: Event[]
}

export interface Venue {
  id: string
  name: string
  description: string
  address: string
  postal_code: number
  amenities: string[]
  images: string[]
  category: string
  status: 'active' | 'inactive' | 'draft'
  owner_id: string
  created_at: string
  updated_at: string
  latitude: number
  longitude: number
  rating: number
  total_reviews: number
  total_bookings: number
  total_revenue: number
}

export interface Event {
  id: string
  name: string
  description: string
  date: string
  time: string
  duration: number
  capacity: number
  price: number
  category: string
  minimum_players: number
  minimum_seats: number
  ticket_closing_timer?: number
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'upcoming' | 'ongoing'
  venue_id: string
  owner_id: string
  created_at: string
  updated_at: string
  images: string[]
  documents: string[]
  requirements: string[]
  total_bookings: number
  total_revenue: number
  rating: number
  total_reviews: number
}

export interface Booking {
  id: string
  customer_id: string
  venue_id?: string
  event_id?: string
  date: string
  time: string
  duration: number
  number_of_guests: number
  total_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
  payment_status: 'paid' | 'unpaid' | 'refunded' | 'partial_refund'
  created_at: string
  updated_at: string
  customer: {
    id: string
    f_name: string
    l_name: string
    mobile_number: number
    email: string
  }
}

export interface Transaction {
  id: string
  owner_id: string
  type: 'deposit' | 'withdraw' | 'booking_payment' | 'refund'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  description: string
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: Owner | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AppState {
  auth: AuthState
  venues: Venue[]
  events: Event[]
  bookings: Booking[]
  transactions: Transaction[]
}


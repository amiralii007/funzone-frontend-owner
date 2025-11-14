import { 
  isEventDatePassed, 
  isTicketSalesClosed, 
  hasReachedMinimumSeatsBeforeClosing,
  determineEventStatus,
  getEventVisualStatus,
  shouldShowEventAsCompleted,
  shouldShowEventAsCancelled
} from '../eventStatusUpdater'
import type { Event } from '../../types/owner'

// Mock current date for consistent testing
const mockCurrentDate = new Date('2024-01-15T10:00:00Z')

// Mock Date.now to return a fixed time
const originalDateNow = Date.now
beforeAll(() => {
  Date.now = jest.fn(() => mockCurrentDate.getTime())
})

afterAll(() => {
  Date.now = originalDateNow
})

describe('eventStatusUpdater', () => {
  const mockEvent: Event = {
    id: '1',
    name: 'Test Event',
    description: 'Test Description',
    date: '2024-01-20',
    time: '14:00 - 16:00',
    duration: 120,
    capacity: 50,
    price: 100,
    category: 'Sports',
    minimum_players: 2,
    minimum_seats: 10,
    ticket_closing_timer: 24, // 24 hours before event
    status: 'upcoming',
    venue_id: 'venue-1',
    owner_id: 'owner-1',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
    images: [],
    documents: [],
    requirements: [],
    total_bookings: 5,
    total_revenue: 500,
    rating: 4.5,
    total_reviews: 10
  }

  describe('isEventDatePassed', () => {
    it('should return false for future events', () => {
      const futureEvent = { ...mockEvent, date: '2024-01-20', time: '14:00 - 16:00' }
      expect(isEventDatePassed(futureEvent)).toBe(false)
    })

    it('should return true for past events', () => {
      const pastEvent = { ...mockEvent, date: '2024-01-10', time: '14:00 - 16:00' }
      expect(isEventDatePassed(pastEvent)).toBe(true)
    })
  })

  describe('isTicketSalesClosed', () => {
    it('should return false for events with open ticket sales', () => {
      const openEvent = { ...mockEvent, date: '2024-01-20', time: '14:00 - 16:00', ticket_closing_timer: 24 }
      expect(isTicketSalesClosed(openEvent)).toBe(false)
    })

    it('should return true for events past ticket closing time', () => {
      const closedEvent = { ...mockEvent, date: '2024-01-16', time: '14:00 - 16:00', ticket_closing_timer: 24 }
      expect(isTicketSalesClosed(closedEvent)).toBe(true)
    })
  })

  describe('hasReachedMinimumSeatsBeforeClosing', () => {
    it('should return true when minimum seats are reached', () => {
      const eventWithEnoughSeats = { 
        ...mockEvent, 
        total_bookings: 15, 
        minimum_seats: 10,
        ticket_closing_timer: 24
      }
      expect(hasReachedMinimumSeatsBeforeClosing(eventWithEnoughSeats)).toBe(true)
    })

    it('should return false when minimum seats are not reached', () => {
      const eventWithInsufficientSeats = { 
        ...mockEvent, 
        total_bookings: 5, 
        minimum_seats: 10,
        ticket_closing_timer: 24
      }
      expect(hasReachedMinimumSeatsBeforeClosing(eventWithInsufficientSeats)).toBe(false)
    })
  })

  describe('determineEventStatus', () => {
    it('should return upcoming for future events', () => {
      const futureEvent = { ...mockEvent, date: '2024-01-20', time: '14:00 - 16:00' }
      expect(determineEventStatus(futureEvent)).toBe('upcoming')
    })

    it('should return completed for events that reached minimum seats', () => {
      const completedEvent = { 
        ...mockEvent, 
        date: '2024-01-10', 
        time: '14:00 - 16:00',
        total_bookings: 15,
        minimum_seats: 10
      }
      expect(determineEventStatus(completedEvent)).toBe('completed')
    })

    it('should return cancelled for events that did not reach minimum seats', () => {
      const cancelledEvent = { 
        ...mockEvent, 
        date: '2024-01-10', 
        time: '14:00 - 16:00',
        total_bookings: 5,
        minimum_seats: 10
      }
      expect(determineEventStatus(cancelledEvent)).toBe('cancelled')
    })
  })

  describe('getEventVisualStatus', () => {
    it('should return completed for events that reached minimum seats after ticket closing', () => {
      const completedEvent = { 
        ...mockEvent, 
        date: '2024-01-16', 
        time: '14:00 - 16:00',
        total_bookings: 15,
        minimum_seats: 10,
        ticket_closing_timer: 24
      }
      expect(getEventVisualStatus(completedEvent)).toBe('completed')
    })

    it('should return cancelled for events that did not reach minimum seats after ticket closing', () => {
      const cancelledEvent = { 
        ...mockEvent, 
        date: '2024-01-16', 
        time: '14:00 - 16:00',
        total_bookings: 5,
        minimum_seats: 10,
        ticket_closing_timer: 24
      }
      expect(getEventVisualStatus(cancelledEvent)).toBe('cancelled')
    })
  })

  describe('shouldShowEventAsCompleted', () => {
    it('should return true for completed events', () => {
      const completedEvent = { 
        ...mockEvent, 
        date: '2024-01-16', 
        time: '14:00 - 16:00',
        total_bookings: 15,
        minimum_seats: 10,
        ticket_closing_timer: 24
      }
      expect(shouldShowEventAsCompleted(completedEvent)).toBe(true)
    })
  })

  describe('shouldShowEventAsCancelled', () => {
    it('should return true for cancelled events', () => {
      const cancelledEvent = { 
        ...mockEvent, 
        date: '2024-01-16', 
        time: '14:00 - 16:00',
        total_bookings: 5,
        minimum_seats: 10,
        ticket_closing_timer: 24
      }
      expect(shouldShowEventAsCancelled(cancelledEvent)).toBe(true)
    })
  })
})

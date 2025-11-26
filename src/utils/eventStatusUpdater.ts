import type { Event } from '../types/owner'

/**
 * Utility functions for automatically updating event status based on date and seat requirements
 */

/**
 * Check if an event's date has passed
 * @param event - The event to check
 * @returns true if the event date has passed, false otherwise
 */
export const isEventDatePassed = (event: Event): boolean => {
  if (!event.date || !event.time) return false
  
  try {
    // Parse event date and time
    const eventDateTime = new Date(`${event.date}T${event.time.split(' - ')[0]}`)
    const now = new Date()
    
    return eventDateTime < now
  } catch (error) {
    console.error('Error parsing event date:', error)
    return false
  }
}

/**
 * Check if ticket sales for an event are closed based on ticket_closing_timer
 * @param event - The event to check
 * @returns true if ticket sales are closed, false otherwise
 */
export const isTicketSalesClosed = (event: Event): boolean => {
  if (!event.date || !event.time) return false
  
  try {
    const eventDateTime = new Date(`${event.date}T${event.time.split(' - ')[0]}`)
    const now = new Date()
    
    // If event has already started or passed, ticket sales are closed
    if (eventDateTime <= now) {
      return true
    }
    
    // If no ticket closing timer is set, ticket sales are always open (until event starts)
    if (!event.ticket_closing_timer) {
      return false
    }
    
    // Calculate the ticket closing time
    const ticketClosingTime = new Date(eventDateTime.getTime() - (event.ticket_closing_timer * 60 * 60 * 1000))
    
    // Check if current time is past the ticket closing time
    return now >= ticketClosingTime
  } catch (error) {
    console.error('Error checking ticket sales status:', error)
    return false
  }
}

/**
 * Check if an event reached minimum seats before ticket closing
 * @param event - The event to check
 * @returns true if minimum seats were reached before ticket closing, false otherwise
 */
export const hasReachedMinimumSeatsBeforeClosing = (event: Event): boolean => {
  if (!event.minimum_seats || !event.ticket_closing_timer) {
    // If no minimum seats requirement or no ticket closing timer, consider it as met
    return true
  }
  
  if (!isTicketSalesClosed(event)) {
    // If ticket sales are still open, we can't determine the final status
    return false
  }
  
  // Check if minimum seats were reached
  const totalBookings = event.total_bookings || 0
  return totalBookings >= event.minimum_seats
}

/**
 * Determine the appropriate status for an event based on date and seat requirements
 * @param event - The event to evaluate
 * @returns The new status for the event
 */
export const determineEventStatus = (event: Event): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' => {
  // If event date hasn't passed, keep it as upcoming
  if (!isEventDatePassed(event)) {
    return 'upcoming'
  }
  
  // If event date has passed, check if it reached minimum seats before ticket closing
  if (hasReachedMinimumSeatsBeforeClosing(event)) {
    return 'completed'
  } else {
    return 'cancelled'
  }
}

/**
 * Check if an event needs status update
 * @param event - The event to check
 * @returns true if the event status should be updated, false otherwise
 */
export const needsStatusUpdate = (event: Event): boolean => {
  const currentStatus = event.status
  const newStatus = determineEventStatus(event)
  
  return currentStatus !== newStatus
}

/**
 * Get the correct event status for display purposes across all components
 * This function provides consistent event status determination throughout the owner app
 * @param event - The event to check
 * @returns The correct status for the event
 */
export const getCorrectEventStatus = (event: Event): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' => {
  // If ticket sales are closed and event is still marked as upcoming,
  // determine the correct status based on minimum seats requirement
  if (isTicketSalesClosed(event) && event.status === 'upcoming') {
    // Check if minimum seats requirement was met
    const totalBookings = event.total_bookings || 0
    const minimumSeats = event.minimum_seats || 0
    
    // If no minimum requirement or minimum was reached, mark as completed
    if (minimumSeats === 0 || totalBookings >= minimumSeats) {
      return 'completed'
    } else {
      // Minimum requirement not met, mark as cancelled
      return 'cancelled'
    }
  }
  
  // For other statuses or when ticket sales are still open, use the backend status
  return event.status as 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
}

/**
 * Check if an event should be considered completed for all purposes
 * This is the single source of truth for determining if an event is completed
 * @param event - The event to check
 * @returns true if event should be considered completed
 */
export const isEventCompleted = (event: Event): boolean => {
  return getCorrectEventStatus(event) === 'completed'
}

/**
 * Check if an event should be considered cancelled for all purposes
 * This is the single source of truth for determining if an event is cancelled
 * @param event - The event to check
 * @returns true if event should be considered cancelled
 */
export const isEventCancelled = (event: Event): boolean => {
  return getCorrectEventStatus(event) === 'cancelled'
}

/**
 * Get time remaining until ticket closing (in milliseconds)
 * @param event - The event to check
 * @returns Time remaining in milliseconds, or null if ticket sales are already closed
 */
export const getTimeUntilTicketClosing = (event: Event): number | null => {
  if (!event.date || !event.time || !event.ticket_closing_timer) {
    return null
  }
  
  try {
    const eventDateTime = new Date(`${event.date}T${event.time.split(' - ')[0]}`)
    const ticketClosingTime = new Date(eventDateTime.getTime() - (event.ticket_closing_timer * 60 * 60 * 1000))
    const now = new Date()
    
    const timeRemaining = ticketClosingTime.getTime() - now.getTime()
    return timeRemaining > 0 ? timeRemaining : null
  } catch (error) {
    console.error('Error calculating time until ticket closing:', error)
    return null
  }
}

/**
 * Check if ticket closing is within 24 hours
 * @param event - The event to check
 * @returns true if ticket closing is within 24 hours
 */
export const isTicketClosingWithin24Hours = (event: Event): boolean => {
  const timeRemaining = getTimeUntilTicketClosing(event)
  if (!timeRemaining) return false
  
  const twentyFourHours = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  return timeRemaining <= twentyFourHours
}

/**
 * Trigger event status updates on the backend
 * This calls the API endpoint that runs the management command
 * @returns Promise with the update result
 */
export const triggerEventStatusUpdate = async (): Promise<{success: boolean, message: string, output?: string}> => {
  try {
    console.log('Starting event status update...')
    const { apiService } = await import('../services/apiService')
    console.log('API service imported, calling updateEventStatuses...')
    const result = await apiService.updateEventStatuses()
    console.log('API call completed, result:', result)
    return result
  } catch (error) {
    console.error('Error triggering event status update:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to trigger status update'
    }
  }
}

/**
 * Check if an event should show as completed (reached minimum participants)
 * @param event - The event to check
 * @returns true if event should show as completed
 */
export const shouldShowEventAsCompleted = (event: Event): boolean => {
  return isTicketSalesClosed(event) && hasReachedMinimumSeatsBeforeClosing(event)
}

/**
 * Check if an event should show as cancelled (didn't reach minimum participants)
 * @param event - The event to check
 * @returns true if event should show as cancelled
 */
export const shouldShowEventAsCancelled = (event: Event): boolean => {
  return isTicketSalesClosed(event) && !hasReachedMinimumSeatsBeforeClosing(event)
}

/**
 * Get the status color class for visual indicators
 * @param event - The event to check
 * @returns CSS class for status color
 */
export const getEventStatusColorClass = (event: Event): string => {
  const status = getCorrectEventStatus(event)
  
  switch (status) {
    case 'completed':
      return 'border-green-500 bg-green-500/10'
    case 'cancelled':
      return 'border-red-500 bg-red-500/10'
    case 'ongoing':
      return 'border-blue-500 bg-blue-500/10'
    case 'upcoming':
    default:
      return 'border-slate-500 bg-slate-500/10'
  }
}

/**
 * Get the status text color class
 * @param event - The event to check
 * @returns CSS class for status text color
 */
export const getEventStatusTextColorClass = (event: Event): string => {
  const status = getCorrectEventStatus(event)
  
  switch (status) {
    case 'completed':
      return 'text-green-400'
    case 'cancelled':
      return 'text-red-400'
    case 'ongoing':
      return 'text-blue-400'
    case 'upcoming':
    default:
      return 'text-slate-400'
  }
}

/**
 * Format time remaining until ticket closing
 * @param event - The event to check
 * @returns Formatted time string or null
 */
export const formatTimeUntilTicketClosing = (event: Event): string | null => {
  const timeRemaining = getTimeUntilTicketClosing(event)
  if (!timeRemaining) return null
  
  const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))
  
  if (days > 0) {
    return `${days} روز و ${hours} ساعت`
  } else if (hours > 0) {
    return `${hours} ساعت و ${minutes} دقیقه`
  } else {
    return `${minutes} دقیقه`
  }
}

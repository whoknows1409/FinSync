// frontend/lib/date-utils.ts
export function formatDateInIST(date: Date): string {
  try {
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided to formatDateInIST:', date);
      return "Invalid date";
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.getTime() === today.getTime()) {
      return "Today";
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      // Format as DD/MM/YYYY
      const options: Intl.DateTimeFormatOptions = { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };
      return date.toLocaleDateString('en-IN', options);
    }
  } catch (error) {
    console.error('Error in formatDateInIST:', error);
    return "Invalid date";
  }
}

export function formatTimeInIST(date: Date): string {
  try {
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided to formatTimeInIST:', date);
      return "Invalid time";
    }
    
    const options: Intl.DateTimeFormatOptions = { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleTimeString('en-IN', options);
  } catch (error) {
    console.error('Error in formatTimeInIST:', error);
    return "Invalid time";
  }
}
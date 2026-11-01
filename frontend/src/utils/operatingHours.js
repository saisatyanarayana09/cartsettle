/**
 * Store Operating Hours & Time Slot Scheduling Utilities
 */

export function checkOperatingHours(settings) {
  if (!settings || !settings.auto_cutoff_orders) {
    return { isClosed: false };
  }
  if (!settings.store_timings_json) {
    return { isClosed: false };
  }

  try {
    let timings = settings.store_timings_json;
    if (typeof timings === 'string') {
      timings = JSON.parse(timings);
    }

    const now = new Date();
    const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[dayIndex];

    let daySchedule = null;
    if (Array.isArray(timings)) {
      daySchedule = timings.find(t => 
        (t.day && String(t.day).toLowerCase() === currentDayName) || 
        t.day_index === dayIndex ||
        t.day === dayIndex
      );
    } else if (typeof timings === 'object' && timings !== null) {
      daySchedule = timings[currentDayName] || 
                    timings[currentDayName.slice(0, 3)] || 
                    timings[currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1)] ||
                    timings[dayIndex] || 
                    timings[String(dayIndex)];
    }

    if (!daySchedule) {
      return { isClosed: false };
    }

    if (daySchedule.is_closed || daySchedule.closed) {
      const capitalizedDay = currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1);
      return {
        isClosed: true,
        message: `The store is scheduled closed today (${capitalizedDay}). Online checkout is currently disabled.`
      };
    }

    const openTimeStr = daySchedule.open || daySchedule.open_time || daySchedule.start;
    const closeTimeStr = daySchedule.close || daySchedule.close_time || daySchedule.end;

    if (!openTimeStr || !closeTimeStr) {
      return { isClosed: false };
    }

    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
      return {
        isClosed: true,
        message: `The store is currently outside operating hours (${openTimeStr} - ${closeTimeStr}). Online orders will resume during regular hours.`
      };
    }
  } catch (err) {
    console.error('Error checking store operating hours:', err);
  }

  return { isClosed: false };
}

export function parseTimeSlots(slotsData) {
  if (!slotsData) return [];
  let list = slotsData;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list) && typeof list === 'object' && list !== null) {
    list = Object.values(list);
  }
  if (!Array.isArray(list)) return [];

  return list.map((item, idx) => {
    if (typeof item === 'string') {
      return { id: idx, label: item, raw: item };
    }
    const label = item.label || item.name || `${item.start_time || item.start || ''} - ${item.end_time || item.end || ''}`.trim() || `Slot ${idx + 1}`;
    return {
      id: item.id || idx,
      label,
      startTime: item.start_time || item.start || item.from,
      endTime: item.end_time || item.end || item.to,
      raw: item
    };
  }).filter(s => s.label);
}

export function isSlotPassedToday(slot, bufferMinutes = 0) {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = currentTotalMinutes + Number(bufferMinutes || 0);

  let startMinutes = null;
  if (slot.startTime) {
    const parts = String(slot.startTime).match(/(\d{1,2}):(\d{2})/);
    if (parts) {
      startMinutes = parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }
  }
  if (startMinutes === null && slot.label) {
    const match = slot.label.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3]?.toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      startMinutes = h * 60 + m;
    }
  }

  if (startMinutes !== null) {
    return startMinutes <= cutoffMinutes;
  }
  return false;
}

export function getLocalDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function extractErrorMessage(err, fallback = 'Could not place your order.') {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail && typeof data.detail === 'string') return data.detail;
  if (data.error && typeof data.error === 'string') return data.error;
  if (data.message && typeof data.message === 'string') return data.message;
  if (typeof data === 'object') {
    const values = Object.values(data);
    for (const val of values) {
      if (Array.isArray(val) && val.length > 0) return String(val[0]);
      if (typeof val === 'string' && val.trim().length > 0) return val;
    }
  }
  return fallback;
}

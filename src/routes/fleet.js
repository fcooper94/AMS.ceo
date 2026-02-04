const express = require('express');
const router = express.Router();
const path = require('path');
const { Op } = require('sequelize');
const { WorldMembership, UserAircraft, Aircraft, User, Airport, RecurringMaintenance, ScheduledFlight, Route, World } = require('../models');
const { REGISTRATION_RULES, validateRegistrationSuffix, getRegistrationPrefix, hasSpecificRule } = require(path.join(__dirname, '../../public/js/registrationPrefixes.js'));

// Check durations in minutes
// daily=30-90min (avg 60), weekly=1.5-3hrs (avg 135), A=6-12hrs (avg 540), C=2-4 weeks (avg 21 days), D=2-3 months (avg 75 days)
const CHECK_DURATIONS = {
  daily: 60,     // 1 hour
  weekly: 135,   // 2.25 hours
  A: 540,        // 9 hours
  C: 30240,      // 21 days
  D: 108000      // 75 days
};

// Check intervals (how long until check expires)
// daily/weekly: days, A: flight hours, C/D: days
const CHECK_INTERVALS = {
  daily: 2,      // 2 days
  weekly: 8,     // 7-8 days
  A: 900,        // 800-1000 flight hours (default 900)
  C: 730,        // 2 years
  D: 2190        // 5-7 years (default 6 years)
};

// How many days/hours before expiry to schedule each check type
const SCHEDULE_BEFORE_EXPIRY = {
  daily: 7,      // Schedule daily checks proactively (up to 7 days ahead)
  weekly: 3,     // Schedule 3 days before expiry
  A: 100,        // Schedule 100 flight hours before due (note: hours, not days)
  C: 30,         // Schedule 1 month before expiry
  D: 60          // Schedule 2 months before expiry
};

/**
 * Check if aircraft is at home base during a given time slot
 * Returns true if aircraft is at home base, false if it's at an outstation
 *
 * Logic: Aircraft is at home base:
 * - Before the first flight of the day departs (minus pre-flight)
 * - After the last flight of the day arrives (plus post-flight)
 * - During overnight hours if no overnight flight in progress
 *
 * @param {string} aircraftId - Aircraft ID
 * @param {string} dateStr - Date string YYYY-MM-DD
 * @param {number} startMinutes - Start time in minutes from midnight
 * @param {number} duration - Duration in minutes
 * @returns {Promise<boolean>} True if aircraft is at home base
 */
async function isAtHomeBase(aircraftId, dateStr, startMinutes, duration) {
  // Get all flights for this date and adjacent dates (for overnight flights)
  const prevDate = new Date(dateStr);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];

  const flights = await ScheduledFlight.findAll({
    where: {
      aircraftId,
      [Op.or]: [
        { scheduledDate: dateStr },
        { arrivalDate: dateStr },
        { scheduledDate: prevDateStr, arrivalDate: dateStr }
      ]
    },
    include: [{
      model: Route,
      as: 'route'
    }, {
      model: UserAircraft,
      as: 'aircraft',
      include: [{ model: Aircraft, as: 'aircraft' }]
    }]
  });

  if (flights.length === 0) {
    // No flights scheduled, aircraft is at home base
    return true;
  }

  const endMinutes = startMinutes + duration;

  // Build periods when aircraft is away from home base
  // Aircraft is away from: pre-flight start to post-flight end (at home base)
  // But during flight + turnaround at destination, it's at the outstation
  const awayPeriods = [];

  for (const flight of flights) {
    const acType = flight.aircraft?.aircraft?.type || 'Narrowbody';
    const pax = flight.aircraft?.aircraft?.passengerCapacity || 150;
    const dist = flight.route?.distance || 0;

    // Pre-flight calculation
    let catering = pax >= 50 && acType !== 'Cargo' ? (pax < 100 ? 5 : pax < 200 ? 10 : 15) : 0;
    let boarding = acType !== 'Cargo' ? (pax < 50 ? 10 : pax < 100 ? 15 : pax < 200 ? 20 : pax < 300 ? 25 : 35) : 0;
    let fuelling = dist < 500 ? 10 : dist < 1500 ? 15 : dist < 3000 ? 20 : 25;
    const preFlight = Math.max(catering + boarding, fuelling);

    const [depH, depM] = flight.departureTime.split(':').map(Number);
    const [arrH, arrM] = flight.arrivalTime.split(':').map(Number);

    // For round-trip routes, aircraft leaves home base at departure and returns on arrival
    // Aircraft is "away" from departure until it arrives back (after post-flight)
    // Since routes are typically outbound+return, the aircraft is away during:
    // - Outbound: from departure to arrival at destination
    // - At destination during turnaround
    // - Return: from destination departure to home base arrival

    // Simplified: aircraft is away from pre-flight start until post-flight at destination
    // Then it's at destination for turnaround, then away again during return
    // Finally back at home after return post-flight

    // For maintenance scheduling, we need to know when aircraft is AT home
    // Aircraft is at home BEFORE the outbound pre-flight starts
    // and AFTER the return post-flight ends

    if (flight.scheduledDate === dateStr) {
      // Flight departs on this date
      // Aircraft leaves home at (departure - preFlight)
      const leavesHome = depH * 60 + depM - preFlight;

      // Check if this is a same-day return or overnight
      if (flight.arrivalDate === dateStr) {
        // Same-day return - aircraft is away from leavesHome to arrival + post-flight
        let deboard = acType !== 'Cargo' ? (pax < 50 ? 5 : pax < 100 ? 8 : pax < 200 ? 12 : pax < 300 ? 15 : 20) : 0;
        let clean = pax < 50 ? 5 : pax < 100 ? 10 : pax < 200 ? 15 : pax < 300 ? 20 : 25;
        const postFlight = deboard + clean;
        const returnsHome = arrH * 60 + arrM + postFlight;
        awayPeriods.push({ start: Math.max(0, leavesHome), end: Math.min(1440, returnsHome) });
      } else {
        // Overnight flight - aircraft is away from leavesHome until end of day
        awayPeriods.push({ start: Math.max(0, leavesHome), end: 1440 });
      }
    }

    // If flight arrives on this date from previous day
    if (flight.arrivalDate === dateStr && flight.scheduledDate !== dateStr) {
      let deboard = acType !== 'Cargo' ? (pax < 50 ? 5 : pax < 100 ? 8 : pax < 200 ? 12 : pax < 300 ? 15 : 20) : 0;
      let clean = pax < 50 ? 5 : pax < 100 ? 10 : pax < 200 ? 15 : pax < 300 ? 20 : 25;
      const postFlight = deboard + clean;
      const returnsHome = arrH * 60 + arrM + postFlight;
      // Aircraft is away from midnight until it returns home
      awayPeriods.push({ start: 0, end: Math.min(1440, returnsHome) });
    }
  }

  // Check if the maintenance slot overlaps with any away period
  for (const away of awayPeriods) {
    if (startMinutes < away.end && endMinutes > away.start) {
      // Maintenance overlaps with away period - aircraft is NOT at home base
      return false;
    }
  }

  // No conflicts - aircraft is at home base
  return true;
}

/**
 * Get flights for an aircraft on a specific date
 * Returns time slots that are occupied by flights
 */
async function getFlightSlotsForDate(aircraftId, dateStr) {
  const slots = [];

  const flights = await ScheduledFlight.findAll({
    where: {
      aircraftId,
      [Op.or]: [
        { scheduledDate: dateStr },
        { arrivalDate: dateStr }
      ]
    },
    include: [{
      model: Route,
      as: 'route'
    }, {
      model: UserAircraft,
      as: 'aircraft',
      include: [{ model: Aircraft, as: 'aircraft' }]
    }]
  });

  for (const flight of flights) {
    const acType = flight.aircraft?.aircraft?.type || 'Narrowbody';
    const pax = flight.aircraft?.aircraft?.passengerCapacity || 150;
    const dist = flight.route?.distance || 0;

    // Pre-flight calculation
    let catering = pax >= 50 && acType !== 'Cargo' ? (pax < 100 ? 5 : pax < 200 ? 10 : 15) : 0;
    let boarding = acType !== 'Cargo' ? (pax < 50 ? 10 : pax < 100 ? 15 : pax < 200 ? 20 : pax < 300 ? 25 : 35) : 0;
    let fuelling = dist < 500 ? 10 : dist < 1500 ? 15 : dist < 3000 ? 20 : 25;
    const preFlight = Math.max(catering + boarding, fuelling);

    // Post-flight calculation
    let deboard = acType !== 'Cargo' ? (pax < 50 ? 5 : pax < 100 ? 8 : pax < 200 ? 12 : pax < 300 ? 15 : 20) : 0;
    let clean = pax < 50 ? 5 : pax < 100 ? 10 : pax < 200 ? 15 : pax < 300 ? 20 : 25;
    const postFlight = deboard + clean;

    const [depH, depM] = flight.departureTime.split(':').map(Number);
    const [arrH, arrM] = flight.arrivalTime.split(':').map(Number);

    // If flight departs on this date
    if (flight.scheduledDate === dateStr) {
      let startMinutes = depH * 60 + depM - preFlight;
      let endMinutes = arrH * 60 + arrM + postFlight;
      if (flight.arrivalDate !== flight.scheduledDate) {
        endMinutes = 1440; // Flight extends past midnight
      }
      slots.push({ start: Math.max(0, startMinutes), end: Math.min(1440, endMinutes) });
    }

    // If flight arrives on this date (from previous day)
    if (flight.arrivalDate === dateStr && flight.scheduledDate !== dateStr) {
      let endMinutes = arrH * 60 + arrM + postFlight;
      slots.push({ start: 0, end: Math.min(1440, endMinutes) });
    }
  }

  return slots;
}

/**
 * Get flights for an aircraft on a specific day of week (legacy - for compatibility)
 * Returns time slots that are occupied by flights
 */
async function getFlightSlotsForDay(aircraftId, dayOfWeek) {
  // Get flights for the next 4 weeks on this day of week
  const today = new Date();
  const slots = [];

  for (let week = 0; week < 4; week++) {
    const targetDate = new Date(today);
    const daysUntil = (dayOfWeek - today.getDay() + 7) % 7 + (week * 7);
    targetDate.setDate(today.getDate() + daysUntil);
    const dateStr = targetDate.toISOString().split('T')[0];

    const flights = await ScheduledFlight.findAll({
      where: {
        aircraftId,
        scheduledDate: dateStr
      },
      include: [{
        model: Route,
        as: 'route'
      }, {
        model: UserAircraft,
        as: 'aircraft',
        include: [{ model: Aircraft, as: 'aircraft' }]
      }]
    });

    for (const flight of flights) {
      // Calculate operation window with turnaround times
      const acType = flight.aircraft?.aircraft?.type || 'Narrowbody';
      const pax = flight.aircraft?.aircraft?.passengerCapacity || 150;
      const dist = flight.route?.distance || 0;

      // Pre-flight calculation
      let catering = pax >= 50 && acType !== 'Cargo' ? (pax < 100 ? 5 : pax < 200 ? 10 : 15) : 0;
      let boarding = acType !== 'Cargo' ? (pax < 50 ? 10 : pax < 100 ? 15 : pax < 200 ? 20 : pax < 300 ? 25 : 35) : 0;
      let fuelling = dist < 500 ? 10 : dist < 1500 ? 15 : dist < 3000 ? 20 : 25;
      const preFlight = Math.max(catering + boarding, fuelling);

      // Post-flight calculation
      let deboard = acType !== 'Cargo' ? (pax < 50 ? 5 : pax < 100 ? 8 : pax < 200 ? 12 : pax < 300 ? 15 : 20) : 0;
      let clean = pax < 50 ? 5 : pax < 100 ? 10 : pax < 200 ? 15 : pax < 300 ? 20 : 25;
      const postFlight = deboard + clean;

      const [depH, depM] = flight.departureTime.split(':').map(Number);
      const [arrH, arrM] = flight.arrivalTime.split(':').map(Number);

      let startMinutes = depH * 60 + depM - preFlight;
      let endMinutes = arrH * 60 + arrM + postFlight;

      // Handle overnight flights
      if (flight.arrivalDate !== flight.scheduledDate) {
        endMinutes += 1440;
      }

      slots.push({ start: startMinutes, end: endMinutes, date: dateStr });
    }
  }

  return slots;
}

/**
 * Find an available time slot for maintenance on a specific date
 * Returns the best start time or null if no slot available
 *
 * Preference: Night hours (22:00-05:00) for minimal disruption to flying schedule
 *
 * Home base rules:
 * - Daily checks can be done at any airport (downroute)
 * - Weekly, A, C, D checks must be done at home base only
 *
 * @param {string} aircraftId - Aircraft ID
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} duration - Duration in minutes
 * @param {string} checkType - Check type: 'daily', 'weekly', 'A', 'C', 'D' (optional, defaults to 'daily')
 */
async function findAvailableSlotOnDate(aircraftId, dateStr, duration, checkType = 'daily') {
  const flightSlots = await getFlightSlotsForDate(aircraftId, dateStr);

  // Get existing maintenance on this date
  const existingMaint = await RecurringMaintenance.findAll({
    where: { aircraftId, scheduledDate: dateStr, status: 'active' }
  });

  // Combine flight and maintenance into busy periods
  const busyPeriods = [...flightSlots];
  for (const maint of existingMaint) {
    const [h, m] = maint.startTime.split(':').map(Number);
    const start = h * 60 + m;
    busyPeriods.push({ start, end: start + maint.duration });
  }

  // Sort by start time
  busyPeriods.sort((a, b) => a.start - b.start);

  // HEAVY PREFERENCE for night hours (22:00-05:00)
  // Order: 22:00, 23:00, 00:00, 01:00, 02:00, 03:00, 04:00, 05:00
  // Then fall back to early morning/late evening if needed
  const preferredStarts = [
    1320, 1380, 0, 60, 120, 180, 240, 300,  // Night hours: 22:00-05:00 (primary)
    360, 1260, 1200, 1140,                   // 06:00, 21:00, 20:00, 19:00 (secondary)
    420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080  // Daytime (last resort)
  ];

  // Non-daily checks require home base - check if aircraft will be there
  const requiresHomeBase = checkType !== 'daily';

  for (const preferredStart of preferredStarts) {
    const slotEnd = preferredStart + duration;

    // For same-day slots (duration < 1440 minutes)
    if (slotEnd <= 1440) {
      let conflict = false;
      for (const busy of busyPeriods) {
        if (preferredStart < busy.end && slotEnd > busy.start) {
          conflict = true;
          break;
        }
      }

      // For non-daily checks, also verify aircraft is at home base
      if (!conflict && requiresHomeBase) {
        const atHome = await isAtHomeBase(aircraftId, dateStr, preferredStart, duration);
        if (!atHome) {
          conflict = true; // Aircraft is at outstation, can't do this check here
        }
      }

      if (!conflict) {
        const hours = Math.floor(preferredStart / 60).toString().padStart(2, '0');
        const mins = (preferredStart % 60).toString().padStart(2, '0');
        return `${hours}:${mins}`;
      }
    }
  }

  // Try every 30-minute slot as last resort (for daily checks only since non-daily need home base)
  if (!requiresHomeBase) {
    for (let mins = 0; mins < 1440; mins += 30) {
      const slotEnd = mins + duration;
      if (slotEnd > 1440) continue;

      let conflict = false;
      for (const busy of busyPeriods) {
        if (mins < busy.end && slotEnd > busy.start) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        const hours = Math.floor(mins / 60).toString().padStart(2, '0');
        const m = (mins % 60).toString().padStart(2, '0');
        return `${hours}:${m}`;
      }
    }
  }

  return null; // No slot available on this date (or no home base slot for non-daily checks)
}

/**
 * Find an available time slot for maintenance on a given day of week (legacy)
 * Returns the best start time or null if no slot available
 */
async function findAvailableMaintenanceSlot(aircraftId, dayOfWeek, duration) {
  const flightSlots = await getFlightSlotsForDay(aircraftId, dayOfWeek);
  const existingMaint = await RecurringMaintenance.findAll({
    where: { aircraftId, dayOfWeek, status: 'active' }
  });

  // Combine flight and maintenance into busy periods
  const busyPeriods = [...flightSlots];
  for (const maint of existingMaint) {
    const [h, m] = maint.startTime.split(':').map(Number);
    const start = h * 60 + m;
    busyPeriods.push({ start, end: start + maint.duration });
  }

  // Sort by start time
  busyPeriods.sort((a, b) => a.start - b.start);

  // HEAVY PREFERENCE for night hours (22:00-05:00)
  // Order: 22:00, 23:00, 00:00, 01:00, 02:00, 03:00, 04:00, 05:00
  const preferredStarts = [
    1320, 1380, 0, 60, 120, 180, 240, 300,  // Night hours: 22:00-05:00 (primary)
    360, 1260, 1200, 1140,                   // 06:00, 21:00, 20:00, 19:00 (secondary)
    420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080  // Daytime (last resort)
  ];

  for (const preferredStart of preferredStarts) {
    const slotEnd = preferredStart + duration;
    let conflict = false;

    for (const busy of busyPeriods) {
      if (preferredStart < busy.end && slotEnd > busy.start) {
        conflict = true;
        break;
      }
    }

    if (!conflict) {
      const hours = Math.floor(preferredStart / 60).toString().padStart(2, '0');
      const mins = (preferredStart % 60).toString().padStart(2, '0');
      return `${hours}:${mins}`;
    }
  }

  // Try every 30-minute slot as last resort
  for (let mins = 0; mins < 1440; mins += 30) {
    const slotEnd = mins + duration;
    let conflict = false;

    for (const busy of busyPeriods) {
      if (mins < busy.end && slotEnd > busy.start) {
        conflict = true;
        break;
      }
    }

    if (!conflict) {
      const hours = Math.floor(mins / 60).toString().padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${hours}:${m}`;
    }
  }

  return null; // No slot available on this day
}

/**
 * Calculate when a check expires based on last check date and interval
 */
function calculateCheckExpiry(lastCheckDate, intervalDays) {
  if (!lastCheckDate) return null;
  const expiry = new Date(lastCheckDate);
  expiry.setDate(expiry.getDate() + intervalDays);
  return expiry;
}

/**
 * Schedule maintenance for an aircraft - Just-In-Time approach
 * ALL checks are one-time scheduled events, scheduled close to expiry
 * to keep the aircraft legal without disrupting the flying program.
 */
async function createAutoScheduledMaintenance(aircraftId, checkTypes, worldId = null) {
  const createdRecords = [];

  // Get the aircraft with its check dates
  const aircraft = await UserAircraft.findByPk(aircraftId, {
    include: [{ model: Aircraft, as: 'aircraft' }]
  });

  if (!aircraft) {
    console.error(`Aircraft ${aircraftId} not found for auto-scheduling`);
    return createdRecords;
  }

  // Get world time if worldId provided, otherwise use membership's world
  let gameNow;
  if (worldId) {
    const world = await World.findByPk(worldId);
    gameNow = world ? new Date(world.currentTime) : new Date();
  } else {
    // Try to get world from membership
    const membership = await WorldMembership.findByPk(aircraft.worldMembershipId);
    if (membership) {
      const world = await World.findByPk(membership.worldId);
      gameNow = world ? new Date(world.currentTime) : new Date();
    } else {
      gameNow = new Date();
    }
  }

  // Check field mappings
  // Note: A check uses hours, others use days
  const checkFieldMap = {
    daily: { lastCheck: 'lastDailyCheckDate', interval: CHECK_INTERVALS.daily },
    weekly: { lastCheck: 'lastWeeklyCheckDate', interval: CHECK_INTERVALS.weekly },
    A: { lastCheck: 'lastACheckDate', intervalHours: aircraft.aCheckIntervalHours || CHECK_INTERVALS.A },
    C: { lastCheck: 'lastCCheckDate', interval: aircraft.cCheckIntervalDays || CHECK_INTERVALS.C },
    D: { lastCheck: 'lastDCheckDate', interval: aircraft.dCheckIntervalDays || CHECK_INTERVALS.D }
  };

  for (const checkType of checkTypes) {
    const fieldInfo = checkFieldMap[checkType];
    if (!fieldInfo) continue;

    // Get last check date and calculate expiry
    const lastCheckDate = aircraft[fieldInfo.lastCheck];
    const expiryDate = calculateCheckExpiry(lastCheckDate, fieldInfo.interval);

    if (!expiryDate) {
      console.log(`No last check date for ${checkType} on aircraft ${aircraft.registration}`);
      continue;
    }

    // Delete any old patterns for this check type (cleanup legacy recurring entries)
    await RecurringMaintenance.destroy({
      where: { aircraftId, checkType, scheduledDate: null }
    });

    const duration = CHECK_DURATIONS[checkType];
    const durationDays = Math.ceil(duration / (24 * 60)); // Convert minutes to days (round up)

    // For A, C, D checks - plan for next 12 months (A is hours-based but still plan ahead)
    if (checkType === 'A' || checkType === 'C' || checkType === 'D') {
      const planningHorizon = 365; // Plan 12 months ahead
      const endPlanningDate = new Date(gameNow);
      endPlanningDate.setDate(endPlanningDate.getDate() + planningHorizon);

      // Get existing scheduled checks for this type
      const existingScheduled = await RecurringMaintenance.findAll({
        where: {
          aircraftId,
          checkType,
          status: 'active',
          scheduledDate: { [Op.ne]: null }
        },
        order: [['scheduledDate', 'ASC']]
      });

      // Track when checks are scheduled to calculate next expiry
      let currentExpiryDate = new Date(expiryDate);
      let checkInterval = fieldInfo.interval;

      // Iterate through planning horizon, scheduling checks as needed
      let iterationCount = 0;
      const maxIterations = 20; // Safety limit

      while (currentExpiryDate <= endPlanningDate && iterationCount < maxIterations) {
        iterationCount++;

        // Calculate when to schedule (leave buffer for check duration + 1-2 days)
        const bufferDays = durationDays + 2;
        let targetStartDate = new Date(currentExpiryDate);
        targetStartDate.setDate(targetStartDate.getDate() - bufferDays);

        // Don't schedule in the past
        if (targetStartDate < gameNow) {
          targetStartDate = new Date(gameNow);
          targetStartDate.setDate(targetStartDate.getDate() + 1);
        }

        const targetDateStr = targetStartDate.toISOString().split('T')[0];

        // Check if already scheduled for this period
        const alreadyScheduled = existingScheduled.some(s => {
          const schedDate = new Date(s.scheduledDate);
          // Consider it scheduled if there's one within 7 days of target
          return Math.abs(schedDate - targetStartDate) < 7 * 24 * 60 * 60 * 1000;
        });

        if (!alreadyScheduled) {
          // Find available slot for A/weekly checks, or use midnight for C/D checks
          // All non-daily checks require home base - checkType is passed to enforce this
          let startTime = '02:00';
          if (checkType === 'A' || checkType === 'weekly') {
            const availableTime = await findAvailableSlotOnDate(aircraftId, targetDateStr, duration, checkType);
            if (availableTime) {
              startTime = availableTime;
            }
          } else {
            startTime = '00:00'; // Heavy maintenance (C/D) starts at midnight (home base assumed)
          }

          const record = await RecurringMaintenance.create({
            aircraftId,
            checkType,
            scheduledDate: targetDateStr,
            startTime,
            duration,
            status: 'active'
          });
          createdRecords.push(record);
          console.log(`Scheduled ${checkType} check for ${aircraft.registration} on ${targetDateStr} at ${startTime}`);
        }

        // Calculate next expiry after this check completes
        // Check completes on targetStartDate + durationDays, then valid for checkInterval days
        const checkCompletionDate = new Date(targetStartDate);
        checkCompletionDate.setDate(checkCompletionDate.getDate() + durationDays);
        currentExpiryDate = new Date(checkCompletionDate);
        currentExpiryDate.setDate(currentExpiryDate.getDate() + checkInterval);
      }
      continue; // Skip to next check type
    } else if (checkType === 'daily') {
      // Daily checks are valid for 2 days - schedule every OTHER day for efficiency
      // This means we need 4 checks per week, not 7
      const daysToSchedule = 7;

      // Get all existing daily check schedules for this aircraft
      const existingDailyChecks = await RecurringMaintenance.findAll({
        where: {
          aircraftId,
          checkType: 'daily',
          status: 'active',
          scheduledDate: { [Op.ne]: null }
        }
      });
      const existingDates = new Set(existingDailyChecks.map(m => {
        if (m.scheduledDate instanceof Date) {
          return m.scheduledDate.toISOString().split('T')[0];
        }
        return String(m.scheduledDate).split('T')[0];
      }));

      console.log(`[DAILY AUTO-SCHEDULE] ${aircraft.registration}: gameNow=${gameNow.toISOString()}, existing schedules: ${existingDates.size}`);

      // Check if aircraft needs a daily check today or tomorrow based on last check
      const lastDailyCheck = aircraft.lastDailyCheckDate;
      let nextRequiredDate = gameNow;
      if (lastDailyCheck) {
        const lastCheckDate = new Date(lastDailyCheck);
        // Daily checks valid for 2 days, so next required is lastCheck + 2 days
        nextRequiredDate = new Date(lastCheckDate);
        nextRequiredDate.setDate(nextRequiredDate.getDate() + 2);
        if (nextRequiredDate < gameNow) {
          nextRequiredDate = gameNow; // If overdue, need one today
        }
      }

      // Schedule checks every 2 days starting from next required date
      let lastScheduledDate = null;
      for (let dayOffset = 0; dayOffset < daysToSchedule; dayOffset++) {
        try {
          const tryDate = new Date(gameNow);
          tryDate.setDate(tryDate.getDate() + dayOffset);
          const dateStr = tryDate.toISOString().split('T')[0];

          // Skip if already scheduled for this date
          if (existingDates.has(dateStr)) {
            lastScheduledDate = dateStr;
            continue;
          }

          // Check if we need a check on this day
          // We need one if: no check scheduled in the previous day (since valid for 2 days)
          const yesterday = new Date(tryDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const hasCoverageFromYesterday = existingDates.has(yesterdayStr) || lastScheduledDate === yesterdayStr;

          if (hasCoverageFromYesterday) {
            console.log(`[DAILY] ${aircraft.registration}: ${dateStr} covered by ${yesterdayStr}, skipping`);
            continue;
          }

          // Find available slot - prefer early morning to maximize flying time
          const availableTime = await findAvailableSlotOnDate(aircraftId, dateStr, duration);
          const startTime = availableTime || '02:00';

          const record = await RecurringMaintenance.create({
            aircraftId,
            checkType,
            scheduledDate: dateStr,
            startTime,
            duration,
            status: 'active'
          });
          createdRecords.push(record);
          existingDates.add(dateStr);
          lastScheduledDate = dateStr;
          console.log(`[DAILY] Scheduled ${aircraft.registration} on ${dateStr} at ${startTime}`);
        } catch (dayError) {
          console.error(`[DAILY] Error scheduling ${aircraft.registration} for day ${dayOffset}:`, dayError.message);
        }
      }
      console.log(`[DAILY] ${aircraft.registration}: completed, created ${createdRecords.length} records`);
    }
  }

  console.log(`[AUTO-SCHEDULE] Completed for aircraft, total records created: ${createdRecords.length}`);
  return createdRecords;
}

/**
 * Refresh auto-scheduled maintenance for an aircraft
 * Called periodically or when flight schedule changes
 */
async function refreshAutoScheduledMaintenance(aircraftId, worldId = null) {
  const aircraft = await UserAircraft.findByPk(aircraftId);
  if (!aircraft) return [];

  // Build list of check types that have auto-schedule enabled
  const enabledChecks = [];
  if (aircraft.autoScheduleDaily) enabledChecks.push('daily');
  if (aircraft.autoScheduleWeekly) enabledChecks.push('weekly');
  if (aircraft.autoScheduleA) enabledChecks.push('A');
  if (aircraft.autoScheduleC) enabledChecks.push('C');
  if (aircraft.autoScheduleD) enabledChecks.push('D');

  if (enabledChecks.length === 0) return [];

  return createAutoScheduledMaintenance(aircraftId, enabledChecks, worldId);
}

/**
 * Remove auto-scheduled maintenance for specific check types
 */
async function removeAutoScheduledMaintenance(aircraftId, checkTypes) {
  for (const checkType of checkTypes) {
    await RecurringMaintenance.destroy({
      where: { aircraftId, checkType }
    });
  }
}

/**
 * Check if a flight time slot conflicts with maintenance
 * Returns { conflicts: boolean, maintenance: RecurringMaintenance | null }
 */
async function checkMaintenanceConflict(aircraftId, scheduledDate, departureTime, arrivalTime, arrivalDate, preFlight = 30, postFlight = 20) {
  const [year, month, day] = scheduledDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();

  // Calculate flight window in minutes
  const [depH, depM] = departureTime.split(':').map(Number);
  const [arrH, arrM] = arrivalTime.split(':').map(Number);
  const flightStart = depH * 60 + depM - preFlight;
  let flightEnd = arrH * 60 + arrM + postFlight;
  if (arrivalDate !== scheduledDate) flightEnd += 1440;

  // Check for maintenance on this day of week
  const maintenance = await RecurringMaintenance.findAll({
    where: { aircraftId, dayOfWeek, status: 'active' }
  });

  for (const maint of maintenance) {
    const [mH, mM] = maint.startTime.split(':').map(Number);
    const maintStart = mH * 60 + mM;
    const maintEnd = maintStart + maint.duration;

    if (flightStart < maintEnd && flightEnd > maintStart) {
      return { conflicts: true, maintenance: maint };
    }
  }

  return { conflicts: false, maintenance: null };
}

/**
 * Attempt to reschedule maintenance to avoid flight conflict
 * EFFICIENT: Position check RIGHT BEFORE the flight starts when possible
 * Returns { success: boolean, newSlot: string | null, error: string | null, deleted: boolean }
 */
async function attemptMaintenanceReschedule(maintenanceId, aircraftId, flightStart, flightEnd) {
  const maint = await RecurringMaintenance.findByPk(maintenanceId);
  if (!maint) return { success: false, error: 'Maintenance not found' };

  const duration = maint.duration;
  const scheduledDate = maint.scheduledDate;
  const checkType = maint.checkType;

  // Get aircraft to check expiry dates
  const aircraft = await UserAircraft.findByPk(aircraftId);
  if (!aircraft) return { success: false, error: 'Aircraft not found' };

  // For daily checks - check if we're still covered by a previous day's check
  // Daily checks are valid for 2 days, so we can delete this one if yesterday has coverage
  if (checkType === 'daily') {
    const yesterday = new Date(scheduledDate + 'T00:00:00');
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayCheck = await RecurringMaintenance.findOne({
      where: { aircraftId, checkType: 'daily', scheduledDate: yesterdayStr, status: 'active' }
    });

    if (yesterdayCheck) {
      // We have coverage from yesterday - just delete this redundant check
      await maint.destroy();
      console.log(`[MAINT] Deleted redundant daily check on ${scheduledDate} - covered by ${yesterdayStr}`);
      return { success: true, newSlot: 'deleted (covered by previous day)', deleted: true };
    }
  }

  // Get all busy slots on this date
  const flightSlots = await getFlightSlotsForDate(aircraftId, scheduledDate);
  const allBusy = [...flightSlots, { start: flightStart, end: flightEnd }];

  // Get other maintenance on this date (excluding current one)
  const otherMaint = await RecurringMaintenance.findAll({
    where: { aircraftId, scheduledDate, status: 'active', id: { [Op.ne]: maintenanceId } }
  });
  for (const m of otherMaint) {
    const [h, min] = m.startTime.split(':').map(Number);
    allBusy.push({ start: h * 60 + min, end: h * 60 + min + m.duration });
  }

  allBusy.sort((a, b) => a.start - b.start);

  // Helper to check if a time slot is available
  const isSlotFree = (start, end) => {
    for (const busy of allBusy) {
      if (start < busy.end && end > busy.start) return false;
    }
    return true;
  };

  // PRIORITY 1: Position check to END right when the flight starts (most efficient)
  const efficientStart = flightStart - duration;
  if (efficientStart >= 0 && isSlotFree(efficientStart, flightStart)) {
    const newTime = `${Math.floor(efficientStart / 60).toString().padStart(2, '0')}:${(efficientStart % 60).toString().padStart(2, '0')}`;
    await maint.update({ startTime: newTime });
    console.log(`[MAINT] Moved ${checkType} check to ${newTime} (right before flight)`);
    return { success: true, newSlot: newTime };
  }

  // PRIORITY 2: Find the largest gap between busy periods and fit the check there
  const gaps = [];
  let lastEnd = 0;
  for (const busy of allBusy) {
    if (busy.start > lastEnd) {
      gaps.push({ start: lastEnd, end: busy.start, size: busy.start - lastEnd });
    }
    lastEnd = Math.max(lastEnd, busy.end);
  }
  // Gap at end of day
  if (lastEnd < 1440) {
    gaps.push({ start: lastEnd, end: 1440, size: 1440 - lastEnd });
  }

  // Sort gaps by size (prefer larger gaps) and find one that fits
  gaps.sort((a, b) => b.size - a.size);
  for (const gap of gaps) {
    if (gap.size >= duration) {
      // Position at the END of the gap (right before next flight)
      const start = gap.end - duration;
      const newTime = `${Math.floor(start / 60).toString().padStart(2, '0')}:${(start % 60).toString().padStart(2, '0')}`;
      await maint.update({ startTime: newTime });
      console.log(`[MAINT] Moved ${checkType} check to ${newTime} (gap before next activity)`);
      return { success: true, newSlot: newTime };
    }
  }

  // PRIORITY 3: For daily checks, try to delete and rely on next day's check
  if (checkType === 'daily') {
    const tomorrow = new Date(scheduledDate + 'T00:00:00');
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Check if tomorrow already has a daily check scheduled
    const tomorrowCheck = await RecurringMaintenance.findOne({
      where: { aircraftId, checkType: 'daily', scheduledDate: tomorrowStr, status: 'active' }
    });

    if (tomorrowCheck) {
      // Tomorrow has a check - we can delete this one
      await maint.destroy();
      console.log(`[MAINT] Deleted daily check on ${scheduledDate} - will use ${tomorrowStr} check`);
      return { success: true, newSlot: 'deleted (using next day)', deleted: true };
    }

    // Create a check for tomorrow instead
    const tomorrowSlot = await findAvailableSlotOnDate(aircraftId, tomorrowStr, duration, checkType);
    if (tomorrowSlot) {
      await maint.update({ scheduledDate: tomorrowStr, startTime: tomorrowSlot });
      console.log(`[MAINT] Moved ${checkType} check to ${tomorrowStr} @ ${tomorrowSlot}`);
      return { success: true, newSlot: `${tomorrowStr} @ ${tomorrowSlot}` };
    }
  }

  // PRIORITY 4: Try other days if check won't expire (for non-daily checks)
  const intervalDays = aircraft[`${checkType === 'daily' ? '' : checkType.toLowerCase()}CheckIntervalDays`] || CHECK_INTERVALS[checkType];
  const lastCheckField = checkType === 'daily' ? 'lastDailyCheckDate' : `last${checkType}CheckDate`;
  const lastCheck = aircraft[lastCheckField];

  if (lastCheck && scheduledDate) {
    const expiryDate = new Date(lastCheck);
    expiryDate.setDate(expiryDate.getDate() + intervalDays);
    const maintDate = new Date(scheduledDate + 'T00:00:00');
    const daysUntilExpiry = Math.floor((expiryDate - maintDate) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry > 1) {
      for (let dayOffset = 1; dayOffset <= Math.min(daysUntilExpiry, 7); dayOffset++) {
        const tryDate = new Date(maintDate);
        tryDate.setDate(tryDate.getDate() + dayOffset);
        const tryDateStr = tryDate.toISOString().split('T')[0];

        if (tryDateStr === scheduledDate || tryDate > expiryDate) continue;

        const slot = await findAvailableSlotOnDate(aircraftId, tryDateStr, duration, checkType);
        if (slot) {
          await maint.update({ scheduledDate: tryDateStr, startTime: slot });
          return { success: true, newSlot: `${tryDateStr} @ ${slot}` };
        }
      }
    }
  }

  // Check cannot be moved without expiring
  return {
    success: false,
    error: `Cannot reschedule ${checkType} check - it would expire. Please clear flights first.`
  };
}

// Export functions for use in scheduling routes
// Export helper functions for use in other routes

/**
 * Get user's fleet for current world
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Get fleet
    const fleet = await UserAircraft.findAll({
      where: { worldMembershipId: membership.id },
      include: [
        {
          model: Aircraft,
          as: 'aircraft'
        }
      ],
      order: [['acquiredAt', 'DESC']]
    });

    // Fetch recurring maintenance for each aircraft separately to avoid association issues
    const fleetWithMaintenance = await Promise.all(fleet.map(async (aircraft) => {
      const aircraftJson = aircraft.toJSON();
      try {
        const maintenance = await RecurringMaintenance.findAll({
          where: { aircraftId: aircraft.id }
        });
        aircraftJson.recurringMaintenance = maintenance;
      } catch (err) {
        console.error('Error fetching recurring maintenance for aircraft:', aircraft.id, err);
        aircraftJson.recurringMaintenance = [];
      }
      return aircraftJson;
    }));

    res.json(fleetWithMaintenance);
  } catch (error) {
    console.error('Error fetching fleet:', error);
    res.status(500).json({ error: 'Failed to fetch fleet', details: error.message });
  }
});

/**
 * Purchase aircraft
 */
router.post('/purchase', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    const {
      aircraftId,
      category, // 'new' or 'used'
      condition,
      conditionPercentage,
      ageYears,
      purchasePrice,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      registration,
      // Check validity (days remaining) - for used aircraft
      cCheckRemainingDays,
      dCheckRemainingDays,
      // Auto-schedule preferences
      autoScheduleDaily,
      autoScheduleWeekly,
      autoScheduleA,
      autoScheduleC,
      autoScheduleD
    } = req.body;

    if (!aircraftId || !category || !purchasePrice || !registration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Check if user has enough balance
    const price = Number(purchasePrice);
    if (membership.balance < price) {
      return res.status(400).json({
        error: 'Insufficient funds',
        required: price,
        available: membership.balance
      });
    }

    // Verify aircraft exists
    const aircraft = await Aircraft.findByPk(aircraftId);
    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Get base airport to determine country for registration validation
    let baseAirportCode = null;
    let baseCountry = null;
    if (membership.baseAirportId) {
      const baseAirport = await Airport.findByPk(membership.baseAirportId);
      if (baseAirport) {
        baseAirportCode = baseAirport.icaoCode;
        baseCountry = baseAirport.country;
      }
    }

    // Validate registration format
    const registrationUpper = registration.trim().toUpperCase();

    // Basic validation
    if (registrationUpper.length < 3 || registrationUpper.length > 10) {
      return res.status(400).json({ error: 'Registration must be between 3 and 10 characters' });
    }
    if (!/^[A-Z0-9]/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration must start with a letter or number' });
    }
    if (!/^[A-Z0-9-]+$/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration can only contain letters, numbers, and hyphens' });
    }

    // Country-specific validation if we know the base country
    if (baseCountry) {
      const prefix = getRegistrationPrefix(baseCountry);
      if (registrationUpper.startsWith(prefix.replace('-', ''))) {
        // Extract suffix (part after prefix)
        const suffix = registrationUpper.substring(prefix.length);
        const validation = validateRegistrationSuffix(suffix, prefix);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message });
        }
      }
    }

    // Check if registration is already in use
    const existingAircraft = await UserAircraft.findOne({ where: { registration: registrationUpper } });
    if (existingAircraft) {
      return res.status(400).json({ error: 'Registration already in use' });
    }

    // Get the world's current time (game world time, not real world time)
    const world = await World.findByPk(activeWorldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    const now = new Date(world.currentTime);

    // Default intervals
    const defaultCInterval = 660; // ~22 months
    const defaultDInterval = 2920; // ~8 years

    let lastCCheckDate, lastDCheckDate;
    let cInterval = defaultCInterval;
    let dInterval = defaultDInterval;

    if (category === 'new') {
      // New aircraft: all checks just done, full validity
      lastCCheckDate = now;
      lastDCheckDate = now;
      // Randomize intervals slightly for variety
      cInterval = 600 + Math.floor(Math.random() * 120); // 600-720 days
      dInterval = 2190 + Math.floor(Math.random() * 1460); // 2190-3650 days
    } else {
      // Used aircraft: calculate last check date based on remaining days
      if (cCheckRemainingDays) {
        const cDaysAgo = cInterval - cCheckRemainingDays;
        lastCCheckDate = new Date(now.getTime() - (cDaysAgo * 24 * 60 * 60 * 1000));
      } else {
        // Default: 6 months validity remaining
        const cDaysAgo = cInterval - 180;
        lastCCheckDate = new Date(now.getTime() - (cDaysAgo * 24 * 60 * 60 * 1000));
      }

      if (dCheckRemainingDays) {
        const dDaysAgo = dInterval - dCheckRemainingDays;
        lastDCheckDate = new Date(now.getTime() - (dDaysAgo * 24 * 60 * 60 * 1000));
      } else {
        // Default: 2 years validity remaining
        const dDaysAgo = dInterval - 730;
        lastDCheckDate = new Date(now.getTime() - (dDaysAgo * 24 * 60 * 60 * 1000));
      }
    }

    // Create user aircraft
    const userAircraft = await UserAircraft.create({
      worldMembershipId: membership.id,
      aircraftId,
      acquisitionType: 'purchase',
      condition: condition || 'New',
      conditionPercentage: conditionPercentage || 100,
      ageYears: ageYears || 0,
      purchasePrice: price,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      registration: registrationUpper,
      currentAirport: baseAirportCode,
      status: 'active',
      // Check dates and intervals
      lastCCheckDate,
      lastDCheckDate,
      cCheckIntervalDays: cInterval,
      dCheckIntervalDays: dInterval,
      // Daily check: EXPIRED on delivery (3-5 days ago, interval is 2 days)
      // Aircraft needs a daily check before it can fly
      lastDailyCheckDate: new Date(now.getTime() - ((3 + Math.floor(Math.random() * 3)) * 24 * 60 * 60 * 1000)),
      // Weekly check: Valid, done 2-5 days ago (interval is 7-8 days)
      lastWeeklyCheckDate: new Date(now.getTime() - ((2 + Math.floor(Math.random() * 4)) * 24 * 60 * 60 * 1000)),
      // A check: Done at 0 hours (new aircraft or reset on delivery)
      lastACheckDate: new Date(now.getTime() - ((1 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000)),
      lastACheckHours: 0,
      aCheckIntervalHours: 800 + Math.floor(Math.random() * 200), // 800-1000 hrs
      // Auto-schedule preferences
      autoScheduleDaily: autoScheduleDaily || false,
      autoScheduleWeekly: autoScheduleWeekly || false,
      autoScheduleA: autoScheduleA || false,
      autoScheduleC: autoScheduleC || false,
      autoScheduleD: autoScheduleD || false
    });

    // Create auto-scheduled maintenance for enabled check types
    const autoCheckTypes = [];
    if (autoScheduleDaily) autoCheckTypes.push('daily');
    if (autoScheduleWeekly) autoCheckTypes.push('weekly');
    if (autoScheduleA) autoCheckTypes.push('A');
    if (autoScheduleC) autoCheckTypes.push('C');
    if (autoScheduleD) autoCheckTypes.push('D');

    if (autoCheckTypes.length > 0) {
      await createAutoScheduledMaintenance(userAircraft.id, autoCheckTypes, activeWorldId);
    }

    // Deduct from balance
    membership.balance -= price;
    await membership.save();

    // Include aircraft details in response
    const result = await UserAircraft.findByPk(userAircraft.id, {
      include: [{
        model: Aircraft,
        as: 'aircraft'
      }]
    });

    res.json({
      message: 'Aircraft purchased successfully',
      aircraft: result,
      newBalance: membership.balance
    });
  } catch (error) {
    console.error('Error purchasing aircraft:', error);
    res.status(500).json({
      error: 'Failed to purchase aircraft',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Lease aircraft
 */
router.post('/lease', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    const {
      aircraftId,
      category,
      condition,
      conditionPercentage,
      ageYears,
      leaseMonthlyPayment,
      leaseDurationMonths,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      purchasePrice, // For reference
      registration,
      // Check validity (days remaining) - for used aircraft
      cCheckRemainingDays,
      dCheckRemainingDays,
      // Auto-schedule preferences
      autoScheduleDaily,
      autoScheduleWeekly,
      autoScheduleA,
      autoScheduleC,
      autoScheduleD
    } = req.body;

    if (!aircraftId || !leaseMonthlyPayment || !leaseDurationMonths || !registration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Check if user can afford first month's payment
    const monthlyPayment = Number(leaseMonthlyPayment);
    if (membership.balance < monthlyPayment) {
      return res.status(400).json({
        error: 'Insufficient funds for first lease payment',
        required: monthlyPayment,
        available: membership.balance
      });
    }

    // Verify aircraft exists
    const aircraft = await Aircraft.findByPk(aircraftId);
    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Get base airport to determine country for registration validation
    let baseAirportCode = null;
    let baseCountry = null;
    if (membership.baseAirportId) {
      const baseAirport = await Airport.findByPk(membership.baseAirportId);
      if (baseAirport) {
        baseAirportCode = baseAirport.icaoCode;
        baseCountry = baseAirport.country;
      }
    }

    // Validate registration format
    const registrationUpper = registration.trim().toUpperCase();

    // Basic validation
    if (registrationUpper.length < 3 || registrationUpper.length > 10) {
      return res.status(400).json({ error: 'Registration must be between 3 and 10 characters' });
    }
    if (!/^[A-Z0-9]/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration must start with a letter or number' });
    }
    if (!/^[A-Z0-9-]+$/.test(registrationUpper)) {
      return res.status(400).json({ error: 'Registration can only contain letters, numbers, and hyphens' });
    }

    // Country-specific validation if we know the base country
    if (baseCountry) {
      const prefix = getRegistrationPrefix(baseCountry);
      if (registrationUpper.startsWith(prefix.replace('-', ''))) {
        // Extract suffix (part after prefix)
        const suffix = registrationUpper.substring(prefix.length);
        const validation = validateRegistrationSuffix(suffix, prefix);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message });
        }
      }
    }

    // Check if registration is already in use
    const existingAircraft = await UserAircraft.findOne({ where: { registration: registrationUpper } });
    if (existingAircraft) {
      return res.status(400).json({ error: 'Registration already in use' });
    }

    // Get the world's current time (game world time, not real world time)
    const world = await World.findByPk(activeWorldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    const now = new Date(world.currentTime);
    const leaseEnd = new Date(now);
    leaseEnd.setMonth(leaseEnd.getMonth() + parseInt(leaseDurationMonths));

    // Calculate check dates based on category and remaining validity
    const defaultCInterval = 660; // ~22 months
    const defaultDInterval = 2920; // ~8 years

    let lastCCheckDate, lastDCheckDate;
    let cInterval = defaultCInterval;
    let dInterval = defaultDInterval;

    if (category === 'new') {
      // New aircraft: all checks just done, full validity
      lastCCheckDate = now;
      lastDCheckDate = now;
      cInterval = 600 + Math.floor(Math.random() * 120);
      dInterval = 2190 + Math.floor(Math.random() * 1460);
    } else {
      // Used aircraft: calculate last check date based on remaining days
      if (cCheckRemainingDays) {
        const cDaysAgo = cInterval - cCheckRemainingDays;
        lastCCheckDate = new Date(now.getTime() - (cDaysAgo * 24 * 60 * 60 * 1000));
      } else {
        const cDaysAgo = cInterval - 180;
        lastCCheckDate = new Date(now.getTime() - (cDaysAgo * 24 * 60 * 60 * 1000));
      }

      if (dCheckRemainingDays) {
        const dDaysAgo = dInterval - dCheckRemainingDays;
        lastDCheckDate = new Date(now.getTime() - (dDaysAgo * 24 * 60 * 60 * 1000));
      } else {
        const dDaysAgo = dInterval - 730;
        lastDCheckDate = new Date(now.getTime() - (dDaysAgo * 24 * 60 * 60 * 1000));
      }
    }

    // Create leased aircraft
    const userAircraft = await UserAircraft.create({
      worldMembershipId: membership.id,
      aircraftId,
      acquisitionType: 'lease',
      condition: condition || 'New',
      conditionPercentage: conditionPercentage || 100,
      ageYears: ageYears || 0,
      purchasePrice: purchasePrice || null,
      leaseMonthlyPayment: monthlyPayment,
      leaseDurationMonths: parseInt(leaseDurationMonths),
      leaseStartDate: now,
      leaseEndDate: leaseEnd,
      maintenanceCostPerHour,
      fuelBurnPerHour,
      registration: registrationUpper,
      currentAirport: baseAirportCode,
      status: 'active',
      // Check dates and intervals
      lastCCheckDate,
      lastDCheckDate,
      cCheckIntervalDays: cInterval,
      dCheckIntervalDays: dInterval,
      // Daily check: EXPIRED on delivery (3-5 days ago, interval is 2 days)
      // Aircraft needs a daily check before it can fly
      lastDailyCheckDate: new Date(now.getTime() - ((3 + Math.floor(Math.random() * 3)) * 24 * 60 * 60 * 1000)),
      // Weekly check: Valid, done 2-5 days ago (interval is 7-8 days)
      lastWeeklyCheckDate: new Date(now.getTime() - ((2 + Math.floor(Math.random() * 4)) * 24 * 60 * 60 * 1000)),
      // A check: Done at 0 hours (new aircraft or reset on delivery)
      lastACheckDate: new Date(now.getTime() - ((1 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000)),
      lastACheckHours: 0,
      aCheckIntervalHours: 800 + Math.floor(Math.random() * 200), // 800-1000 hrs
      // Auto-schedule preferences
      autoScheduleDaily: autoScheduleDaily || false,
      autoScheduleWeekly: autoScheduleWeekly || false,
      autoScheduleA: autoScheduleA || false,
      autoScheduleC: autoScheduleC || false,
      autoScheduleD: autoScheduleD || false
    });

    // Create auto-scheduled maintenance for enabled check types
    const autoCheckTypes = [];
    if (autoScheduleDaily) autoCheckTypes.push('daily');
    if (autoScheduleWeekly) autoCheckTypes.push('weekly');
    if (autoScheduleA) autoCheckTypes.push('A');
    if (autoScheduleC) autoCheckTypes.push('C');
    if (autoScheduleD) autoCheckTypes.push('D');

    if (autoCheckTypes.length > 0) {
      await createAutoScheduledMaintenance(userAircraft.id, autoCheckTypes, activeWorldId);
    }

    // Deduct first month's payment
    membership.balance -= monthlyPayment;
    await membership.save();

    // Include aircraft details in response
    const result = await UserAircraft.findByPk(userAircraft.id, {
      include: [{
        model: Aircraft,
        as: 'aircraft'
      }]
    });

    res.json({
      message: 'Aircraft leased successfully',
      aircraft: result,
      newBalance: membership.balance
    });
  } catch (error) {
    console.error('Error leasing aircraft:', error);
    res.status(500).json({
      error: 'Failed to lease aircraft',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get maintenance status for all aircraft
 */
router.get('/maintenance', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Get fleet with maintenance check dates
    const fleet = await UserAircraft.findAll({
      where: { worldMembershipId: membership.id },
      include: [
        {
          model: Aircraft,
          as: 'aircraft'
        }
      ],
      order: [['registration', 'ASC']]
    });

    res.json(fleet);
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance data' });
  }
});

/**
 * Record a maintenance check
 */
router.post('/maintenance/:aircraftId/check', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { aircraftId } = req.params;
    const { checkType } = req.body;

    if (!['A', 'C', 'D'].includes(checkType)) {
      return res.status(400).json({ error: 'Invalid check type' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Find the aircraft and verify ownership
    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId: membership.id }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Update the appropriate check date
    const now = new Date();
    const updateData = {};

    // Cascading check validation: D → C → A → weekly → daily
    if (checkType === 'A') {
      // A check validates weekly and daily
      updateData.lastACheckDate = now;
      updateData.lastACheckHours = aircraft.totalFlightHours || 0;
      updateData.lastWeeklyCheckDate = now;
      updateData.lastDailyCheckDate = now;
    } else if (checkType === 'C') {
      // C check validates A, weekly, and daily
      updateData.lastCCheckDate = now;
      updateData.lastACheckDate = now;
      updateData.lastACheckHours = aircraft.totalFlightHours || 0;
      updateData.lastWeeklyCheckDate = now;
      updateData.lastDailyCheckDate = now;
    } else if (checkType === 'D') {
      // D check validates C, A, weekly, and daily
      updateData.lastDCheckDate = now;
      updateData.lastCCheckDate = now;
      updateData.lastACheckDate = now;
      updateData.lastACheckHours = aircraft.totalFlightHours || 0;
      updateData.lastWeeklyCheckDate = now;
      updateData.lastDailyCheckDate = now;
    }

    await aircraft.update(updateData);

    res.json({
      message: `${checkType} Check recorded successfully`,
      checkDate: now.toISOString(),
      aircraft: aircraft
    });
  } catch (error) {
    console.error('Error recording maintenance check:', error);
    res.status(500).json({ error: 'Failed to record maintenance check' });
  }
});

/**
 * Perform a maintenance check immediately (mark as complete now)
 */
router.post('/:aircraftId/perform-check', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { aircraftId } = req.params;
    const { checkType } = req.body;

    if (!['daily', 'weekly', 'A', 'C', 'D'].includes(checkType)) {
      return res.status(400).json({ error: 'Invalid check type' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Find the aircraft and verify ownership
    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId: membership.id }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Update the appropriate check date
    const now = new Date();
    const updateData = {};

    // Cascading check validation:
    // D → C → A → weekly → daily
    switch (checkType) {
      case 'daily':
        updateData.lastDailyCheckDate = now;
        break;
      case 'weekly':
        // Weekly validates daily
        updateData.lastWeeklyCheckDate = now;
        updateData.lastDailyCheckDate = now;
        break;
      case 'A':
        // A check validates weekly and daily
        updateData.lastACheckDate = now;
        updateData.lastACheckHours = aircraft.totalFlightHours || 0;
        updateData.lastWeeklyCheckDate = now;
        updateData.lastDailyCheckDate = now;
        break;
      case 'C':
        // C check validates A, weekly, and daily
        updateData.lastCCheckDate = now;
        updateData.lastACheckDate = now;
        updateData.lastACheckHours = aircraft.totalFlightHours || 0;
        updateData.lastWeeklyCheckDate = now;
        updateData.lastDailyCheckDate = now;
        break;
      case 'D':
        // D check validates C, A, weekly, and daily
        updateData.lastDCheckDate = now;
        updateData.lastCCheckDate = now;
        updateData.lastACheckDate = now;
        updateData.lastACheckHours = aircraft.totalFlightHours || 0;
        updateData.lastWeeklyCheckDate = now;
        updateData.lastDailyCheckDate = now;
        break;
    }

    await aircraft.update(updateData);

    res.json({
      message: `${checkType} Check performed successfully`,
      checkDate: now.toISOString(),
      flightHours: checkType === 'A' ? (aircraft.totalFlightHours || 0) : undefined,
      aircraft: aircraft
    });
  } catch (error) {
    console.error('Error performing maintenance check:', error);
    res.status(500).json({ error: 'Failed to perform maintenance check' });
  }
});

/**
 * Update auto-schedule preferences for an aircraft
 */
router.put('/:aircraftId/auto-schedule', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { aircraftId } = req.params;
    const { checkType, enabled } = req.body;

    if (!checkType || !['daily', 'weekly', 'A', 'C', 'D'].includes(checkType)) {
      return res.status(400).json({ error: 'Invalid check type' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Find the aircraft and verify ownership
    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId: membership.id }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Update the appropriate auto-schedule field
    const fieldMap = {
      'daily': 'autoScheduleDaily',
      'weekly': 'autoScheduleWeekly',
      'A': 'autoScheduleA',
      'C': 'autoScheduleC',
      'D': 'autoScheduleD'
    };

    const updateField = fieldMap[checkType];
    await aircraft.update({ [updateField]: enabled });

    // If enabled, create auto-scheduled maintenance; if disabled, remove it
    if (enabled) {
      await createAutoScheduledMaintenance(aircraftId, [checkType], activeWorldId);
    } else {
      await removeAutoScheduledMaintenance(aircraftId, [checkType]);
    }

    res.json({
      message: `Auto-schedule for ${checkType} check ${enabled ? 'enabled' : 'disabled'}`,
      checkType,
      enabled,
      aircraft: aircraft
    });
  } catch (error) {
    console.error('Error updating auto-schedule:', error);
    res.status(500).json({ error: 'Failed to update auto-schedule preference' });
  }
});

/**
 * Get auto-schedule preferences for an aircraft
 */
router.get('/:aircraftId/auto-schedule', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { aircraftId } = req.params;

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Find the aircraft and verify ownership
    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId: membership.id }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    res.json({
      aircraftId,
      autoScheduleDaily: aircraft.autoScheduleDaily || false,
      autoScheduleWeekly: aircraft.autoScheduleWeekly || false,
      autoScheduleA: aircraft.autoScheduleA || false,
      autoScheduleC: aircraft.autoScheduleC || false,
      autoScheduleD: aircraft.autoScheduleD || false
    });
  } catch (error) {
    console.error('Error fetching auto-schedule preferences:', error);
    res.status(500).json({ error: 'Failed to fetch auto-schedule preferences' });
  }
});

/**
 * POST /:aircraftId/optimize-maintenance
 * Re-optimize all maintenance positions for an aircraft
 * Moves daily checks to right before flights for efficiency
 */
router.post('/:aircraftId/optimize-maintenance', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { aircraftId } = req.params;

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    // Get user's membership
    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    // Find the aircraft and verify ownership
    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId: membership.id }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Get all scheduled maintenance dates for this aircraft
    const maintenanceRecords = await RecurringMaintenance.findAll({
      where: { aircraftId, status: 'active' },
      attributes: ['scheduledDate']
    });

    const dates = [...new Set(maintenanceRecords.map(m => m.scheduledDate).filter(Boolean))];

    if (dates.length === 0) {
      return res.json({ message: 'No maintenance to optimize', optimized: [] });
    }

    // Run optimization
    const optimized = await optimizeMaintenanceForDates(aircraftId, dates);

    res.json({
      message: `Optimized maintenance on ${dates.length} dates`,
      optimized
    });
  } catch (error) {
    console.error('Error optimizing maintenance:', error);
    res.status(500).json({ error: 'Failed to optimize maintenance' });
  }
});

/**
 * Optimize maintenance positions for given dates
 * Called after a flight is scheduled to reposition checks efficiently
 * Places daily checks RIGHT BEFORE the first flight DEPARTURE of the day
 * If a date only has arriving flights (no departures), move the check to the departure date
 */
async function optimizeMaintenanceForDates(aircraftId, dates) {
  const optimized = [];

  for (const dateStr of dates) {
    // Get all daily checks on this date
    const dailyChecks = await RecurringMaintenance.findAll({
      where: { aircraftId, scheduledDate: dateStr, checkType: 'daily', status: 'active' }
    });

    if (dailyChecks.length === 0) continue;

    // Get flights that DEPART on this date (not just arrive)
    const departingFlights = await ScheduledFlight.findAll({
      where: {
        aircraftId,
        scheduledDate: dateStr  // Only flights that DEPART on this date
      },
      include: [{
        model: Route,
        as: 'route'
      }, {
        model: UserAircraft,
        as: 'aircraft',
        include: [{ model: Aircraft, as: 'aircraft' }]
      }]
    });

    // Check if there are only arriving flights (from previous day) on this date
    const arrivingOnlyFlights = await ScheduledFlight.findAll({
      where: {
        aircraftId,
        arrivalDate: dateStr,
        scheduledDate: { [Op.ne]: dateStr }  // Departed on different day
      }
    });

    // If NO departing flights on this date, but there ARE arriving flights
    // This means the daily check should be on the departure date instead
    if (departingFlights.length === 0 && arrivingOnlyFlights.length > 0) {
      // Move daily checks to the departure date of the arriving flight(s)
      for (const check of dailyChecks) {
        // Get the departure date from the arriving flight
        const depDate = arrivingOnlyFlights[0].scheduledDate;

        // Check if there's already a daily check on the departure date
        const existingOnDepDate = await RecurringMaintenance.findOne({
          where: { aircraftId, scheduledDate: depDate, checkType: 'daily', status: 'active' }
        });

        if (existingOnDepDate) {
          // Already have a check on the departure date, remove this redundant one
          await check.update({ status: 'inactive' });
          optimized.push({
            date: dateStr,
            checkType: 'daily',
            action: 'removed',
            reason: `Covered by check on ${depDate}`
          });
          console.log(`[OPTIMIZE] Removed redundant daily check on ${dateStr} (covered by ${depDate})`);
        } else {
          // Move this check to the departure date
          await check.update({ scheduledDate: depDate });
          optimized.push({
            date: dateStr,
            checkType: 'daily',
            action: 'moved',
            newDate: depDate,
            reason: 'Moved to actual departure date'
          });
          console.log(`[OPTIMIZE] Moved daily check from ${dateStr} to ${depDate} (actual departure date)`);

          // Now optimize the check on its new date
          dates.push(depDate); // Add to dates to process
        }
      }
      continue;
    }

    // If we have departing flights, optimize the check position
    if (departingFlights.length === 0) continue;

    // Calculate pre-flight times for departing flights
    const departureSlots = [];
    for (const flight of departingFlights) {
      const acType = flight.aircraft?.aircraft?.type || 'Narrowbody';
      const pax = flight.aircraft?.aircraft?.passengerCapacity || 150;
      const dist = flight.route?.distance || 0;

      // Pre-flight calculation
      let catering = pax >= 50 && acType !== 'Cargo' ? (pax < 100 ? 5 : pax < 200 ? 10 : 15) : 0;
      let boarding = acType !== 'Cargo' ? (pax < 50 ? 10 : pax < 100 ? 15 : pax < 200 ? 20 : pax < 300 ? 25 : 35) : 0;
      let fuelling = dist < 500 ? 10 : dist < 1500 ? 15 : dist < 3000 ? 20 : 25;
      const preFlight = Math.max(catering + boarding, fuelling);

      const [depH, depM] = flight.departureTime.split(':').map(Number);
      const preFlightStart = depH * 60 + depM - preFlight;

      departureSlots.push({
        start: Math.max(0, preFlightStart),
        departureTime: depH * 60 + depM,
        preFlight
      });
    }

    // Sort by earliest pre-flight start
    departureSlots.sort((a, b) => a.start - b.start);

    // Get all flight activity on this date (for conflict checking)
    const allFlights = await getFlightSlotsForDate(aircraftId, dateStr);

    // Get other maintenance (non-daily) on this date
    const otherMaint = await RecurringMaintenance.findAll({
      where: {
        aircraftId,
        scheduledDate: dateStr,
        checkType: { [Op.ne]: 'daily' },
        status: 'active'
      }
    });
    const otherMaintSlots = otherMaint.map(m => {
      const [h, min] = m.startTime.split(':').map(Number);
      return { start: h * 60 + min, end: h * 60 + min + m.duration };
    });

    // Position check to END right when pre-flight starts (before first departure)
    const firstPreFlightStart = departureSlots[0].start;

    // For each daily check, try to position it right before the first departure's pre-flight
    for (const check of dailyChecks) {
      const duration = check.duration;
      const optimalStart = firstPreFlightStart - duration;

      // Check if this slot is actually free
      if (optimalStart < 0) continue; // Can't fit before midnight

      const allBusy = [...allFlights, ...otherMaintSlots];
      let isFree = true;
      for (const busy of allBusy) {
        if (optimalStart < busy.end && (optimalStart + duration) > busy.start) {
          isFree = false;
          break;
        }
      }

      if (isFree) {
        const newTime = `${Math.floor(optimalStart / 60).toString().padStart(2, '0')}:${(optimalStart % 60).toString().padStart(2, '0')}`;
        const oldTime = check.startTime.substring(0, 5);

        if (newTime !== oldTime) {
          await check.update({ startTime: newTime });
          optimized.push({ date: dateStr, checkType: 'daily', oldTime, newTime });
          console.log(`[OPTIMIZE] Moved daily check on ${dateStr} from ${oldTime} to ${newTime} (right before departure pre-flight)`);
        }
      }
    }
  }

  return optimized;
}

// Export router as default and helper functions
module.exports = router;
module.exports.checkMaintenanceConflict = checkMaintenanceConflict;
module.exports.attemptMaintenanceReschedule = attemptMaintenanceReschedule;
module.exports.findAvailableMaintenanceSlot = findAvailableMaintenanceSlot;
module.exports.findAvailableSlotOnDate = findAvailableSlotOnDate;
module.exports.createAutoScheduledMaintenance = createAutoScheduledMaintenance;
module.exports.refreshAutoScheduledMaintenance = refreshAutoScheduledMaintenance;
module.exports.optimizeMaintenanceForDates = optimizeMaintenanceForDates;

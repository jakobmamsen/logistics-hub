// ============================================================================
// LOGISTICS HUB RELEASE 1 — WORKFLOW UTILITIES
// ============================================================================
// File: workflow-utils.js
// Purpose: Workflow engine, milestone calculations, timezone handling
// Status: Production-ready for Release 1
//
// Functions:
// 1. calculateMilestoneDate() - Calculate planned date for a milestone
// 2. getTimezoneOffset() - Get UTC offset for IANA timezone
// 3. formatDateInTimezone() - Format date in specific timezone
// 4. createMilestonesFromTemplate() - Generate milestones from template
// 5. generatePreAlertChecklist() - Auto-generate pre-alert items
// 6. validateWorkflowProgress() - Check if workflow is on track
//
// ============================================================================

// ============================================================================
// TIMEZONE DATABASE (IANA Timezone → UTC Offset)
// ============================================================================
// Common timezones used in logistics (European, Asian, US)
// In production, load from timezone table

const TIMEZONE_MAP = {
  'Europe/Berlin': 1,        // CET (UTC+1 or UTC+2 DST)
  'Europe/Amsterdam': 1,
  'Europe/London': 0,        // GMT (UTC+0 or UTC+1 DST)
  'Europe/Paris': 1,
  'Europe/Stockholm': 1,
  'Europe/Hamburg': 1,
  'Asia/Singapore': 8,       // SGT (UTC+8)
  'Asia/Hong_Kong': 8,       // HKT (UTC+8)
  'Asia/Shanghai': 8,        // CST (UTC+8)
  'Asia/Dubai': 4,           // GST (UTC+4)
  'Asia/Bangkok': 7,         // ICT (UTC+7)
  'Asia/Jakarta': 7,         // WIB (UTC+7)
  'Asia/Tokyo': 9,           // JST (UTC+9)
  'America/New_York': -5,    // EST (UTC-5 or UTC-4 EDT)
  'America/Los_Angeles': -8, // PST (UTC-8 or UTC-7 PDT)
  'America/Chicago': -6,     // CST (UTC-6 or UTC-5 CDT)
  'UTC': 0
};

// ============================================================================
// 1. CALCULATE MILESTONE DATE
// ============================================================================
// Calculates planned date for a milestone based on job timezone

/**
 * Calculate planned date for a milestone
 * @param {string} baseDate - Base date (job creation or previous milestone) - ISO string
 * @param {number} daysOffset - Number of days to add
 * @param {string} timezoneId - IANA timezone name (e.g., 'Europe/Hamburg')
 * @returns {object} { plannedDate: 'YYYY-MM-DD', timezone: 'IANA', utcOffset: number }
 */
export function calculateMilestoneDate(baseDate, daysOffset, timezoneId) {
  if (!baseDate || daysOffset === undefined || !timezoneId) {
    throw new Error('baseDate, daysOffset, and timezoneId are required');
  }
  
  // Parse base date (ISO format: 2026-09-10T10:00:00Z)
  const base = new Date(baseDate);
  
  // Add days offset
  const planned = new Date(base);
  planned.setUTCDate(planned.getUTCDate() + daysOffset);
  
  // Get timezone offset (in production, fetch from timezone table)
  const utcOffset = TIMEZONE_MAP[timezoneId] || 0;
  
  // Adjust for timezone (convert UTC date to local date in that timezone)
  const localDate = new Date(planned);
  localDate.setHours(localDate.getHours() + utcOffset);
  
  // Format as YYYY-MM-DD
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  
  return {
    plannedDate: `${year}-${month}-${day}`,
    timezone: timezoneId,
    utcOffset
  };
}

// ============================================================================
// 2. GET TIMEZONE OFFSET
// ============================================================================
// Gets UTC offset for an IANA timezone

export function getTimezoneOffset(timezoneId) {
  return TIMEZONE_MAP[timezoneId] || 0;
}

// ============================================================================
// 3. FORMAT DATE IN TIMEZONE
// ============================================================================
// Formats a date in a specific timezone

export function formatDateInTimezone(date, timezoneId, format = 'YYYY-MM-DD') {
  if (!date || !timezoneId) {
    throw new Error('date and timezoneId are required');
  }
  
  const d = new Date(date);
  const utcOffset = getTimezoneOffset(timezoneId);
  
  // Adjust for timezone
  const localDate = new Date(d);
  localDate.setHours(localDate.getHours() + utcOffset);
  
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  
  if (format === 'DD.MM.YYYY') {
    return `${day}.${month}.${year}`;
  } else if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  } else {
    // Default: YYYY-MM-DD
    return `${year}-${month}-${day}`;
  }
}

// ============================================================================
// 4. CREATE MILESTONES FROM TEMPLATE
// ============================================================================
// Generates job milestones from workflow template

export function createMilestonesFromTemplate(
  template,
  jobCreatedAt,
  originTimezoneId,
  destinationTimezoneId
) {
  if (!template || !template.milestone_definitions) {
    throw new Error('Template with milestone_definitions is required');
  }
  
  const milestoneDefs = JSON.parse(
    typeof template.milestone_definitions === 'string'
      ? template.milestone_definitions
      : template.milestone_definitions
  );
  
  const milestones = [];
  let currentDate = jobCreatedAt;
  
  milestoneDefs.forEach((def, index) => {
    // Determine timezone (origin for pickup, destination for delivery)
    const isMostlyOrigin = index < milestoneDefs.length / 2;
    const timezoneId = isMostlyOrigin ? originTimezoneId : destinationTimezoneId;
    
    // Calculate milestone date
    const daysOffset = def.planned_days || 0;
    const { plannedDate } = calculateMilestoneDate(currentDate, daysOffset, timezoneId);
    
    milestones.push({
      milestone_name: def.name,
      milestone_sequence: index + 1,
      planned_date: plannedDate,
      planned_date_timezone: timezoneId,
      status: 'pending',
      trigger_rule: def.trigger // for internal use, not stored in MVP
    });
    
    // Update currentDate for next milestone (if linked)
    if (def.trigger === 'previous_milestone') {
      currentDate = `${plannedDate}T00:00:00Z`;
    }
  });
  
  return milestones;
}

// ============================================================================
// 5. GENERATE PRE-ALERT CHECKLIST
// ============================================================================
// Auto-generates pre-alert checklist items from job/quote data

export function generatePreAlertChecklist(job, quote) {
  if (!job || !quote) {
    throw new Error('job and quote are required');
  }
  
  const checklist = [];
  
  // Standard pre-alert items
  const standardItems = [
    { item: 'Shipper details confirmed', required: true },
    { item: 'Consignee details confirmed', required: true },
    { item: 'Invoice number and date', required: true },
    { item: 'Bill of Lading reference', required: true },
    { item: 'Cargo weight (CBM)', required: true },
    { item: 'Product description', required: true },
    { item: 'HS Code classification', required: true },
    { item: 'Country of origin', required: true },
    { item: 'Harmonized tariff confirmed', required: false },
    { item: 'Special permits required', required: false },
    { item: 'Restricted/prohibited items check', required: true }
  ];
  
  // Check for hazmat
  if (quote.hazmat || job.is_hazmat) {
    standardItems.push({
      item: 'Hazmat classification & UN number',
      required: true
    });
    standardItems.push({
      item: 'Safety data sheet provided',
      required: true
    });
  }
  
  // Check for customs hold or sensitive route
  if (job.destination_country_id && job.destination_country_id === 'sensitive-countries') {
    standardItems.push({
      item: 'Sanctions/embargo check performed',
      required: true
    });
  }
  
  // Convert to checklist format
  return standardItems.map(item => ({
    item: item.item,
    required: item.required,
    completed: false,
    completed_by: null,
    completed_at: null
  }));
}

// ============================================================================
// 6. VALIDATE WORKFLOW PROGRESS
// ============================================================================
// Checks if workflow is on track vs. planned

export function validateWorkflowProgress(milestones, currentMilestoneIndex) {
  if (!milestones || milestones.length === 0) {
    throw new Error('milestones array is required');
  }
  
  const status = {
    onTrack: true,
    atRisk: false,
    delayed: false,
    completed: [],
    pending: [],
    atRiskMilestones: []
  };
  
  const today = new Date();
  const todayDate = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  
  milestones.forEach(m => {
    if (m.status === 'completed') {
      status.completed.push(m.milestone_name);
    } else if (m.status === 'pending' || m.status === 'in_progress') {
      status.pending.push(m.milestone_name);
      
      // Check if milestone is at risk (today is past planned date, not completed)
      if (todayDate > m.planned_date && m.status === 'pending') {
        status.atRisk = true;
        status.atRiskMilestones.push({
          milestone: m.milestone_name,
          plannedDate: m.planned_date,
          daysLate: Math.floor(
            (new Date(todayDate) - new Date(m.planned_date)) / (1000 * 60 * 60 * 24)
          )
        });
      }
    }
  });
  
  // Determine overall status
  if (status.atRisk) {
    status.onTrack = false;
    status.delayed = true;
  }
  
  return status;
}

// ============================================================================
// 7. CALCULATE TRANSIT TIME
// ============================================================================
// Calculates expected transit time between origin and destination

export function calculateTransitTime(
  serviceType,
  originCountryCode,
  destinationCountryCode,
  routeOverride = null
) {
  // Standard transit times (MVP: hardcoded, Phase C.1: moved to config table)
  const transitTimes = {
    'Ocean FCL': {
      'Europe-Asia': 21,
      'Europe-US': 10,
      'Asia-US': 14,
      default: 21
    },
    'Ocean LCL': {
      'Europe-Asia': 24,
      'Europe-US': 14,
      'Asia-US': 17,
      default: 24
    },
    'Air': {
      'Europe-Asia': 2,
      'Europe-US': 1,
      'Asia-US': 1,
      default: 2
    },
    'Road': {
      default: 3
    }
  };
  
  if (routeOverride) {
    return routeOverride; // Custom override
  }
  
  const serviceTransits = transitTimes[serviceType] || {};
  return serviceTransits.default || 21;
}

// ============================================================================
// 8. GET MILESTONE TEMPLATE
// ============================================================================
// Returns pre-defined milestone templates

export function getMilestoneTemplate(serviceType) {
  const templates = {
    'Ocean Export FCL': {
      name: 'Ocean Export FCL',
      milestones: [
        { name: 'Cargo Pickup', planned_days: 0, trigger: 'job_creation' },
        {
          name: 'Cargo in Port',
          planned_days: 1,
          trigger: 'previous_milestone'
        },
        {
          name: 'Customs Clearance',
          planned_days: 2,
          trigger: 'previous_milestone'
        },
        {
          name: 'VGM Submission',
          planned_days: 3,
          trigger: 'previous_milestone'
        },
        {
          name: 'Container Stuffing',
          planned_days: 5,
          trigger: 'previous_milestone'
        },
        {
          name: 'Vessel Departure',
          planned_days: 7,
          trigger: 'previous_milestone'
        },
        {
          name: 'In Transit',
          planned_days: 21,
          trigger: 'previous_milestone',
          offset_days: 14
        },
        {
          name: 'Vessel Arrival',
          planned_days: 21,
          trigger: 'previous_milestone'
        },
        {
          name: 'Customs Clearance Destination',
          planned_days: 24,
          trigger: 'previous_milestone'
        },
        {
          name: 'Delivery',
          planned_days: 26,
          trigger: 'previous_milestone'
        }
      ]
    },
    'Ocean Import FCL': {
      name: 'Ocean Import FCL',
      milestones: [
        { name: 'Shipment Booked', planned_days: 0, trigger: 'job_creation' },
        {
          name: 'Vessel Departure',
          planned_days: 1,
          trigger: 'previous_milestone'
        },
        {
          name: 'In Transit',
          planned_days: 21,
          trigger: 'previous_milestone',
          offset_days: 20
        },
        {
          name: 'Vessel Arrival',
          planned_days: 21,
          trigger: 'previous_milestone'
        },
        {
          name: 'Customs Clearance',
          planned_days: 23,
          trigger: 'previous_milestone'
        },
        {
          name: 'Cargo Release',
          planned_days: 24,
          trigger: 'previous_milestone'
        },
        {
          name: 'Pickup Arranged',
          planned_days: 25,
          trigger: 'previous_milestone'
        },
        {
          name: 'Delivery',
          planned_days: 26,
          trigger: 'previous_milestone'
        }
      ]
    },
    'Air Freight': {
      name: 'Air Freight',
      milestones: [
        { name: 'Cargo Pickup', planned_days: 0, trigger: 'job_creation' },
        { name: 'Cargo in Air Port', planned_days: 0.5, trigger: 'previous_milestone' },
        { name: 'Customs Clearance', planned_days: 1, trigger: 'previous_milestone' },
        { name: 'Flight Departure', planned_days: 1, trigger: 'previous_milestone' },
        { name: 'In Transit', planned_days: 2, trigger: 'previous_milestone' },
        {
          name: 'Flight Arrival',
          planned_days: 2,
          trigger: 'previous_milestone'
        },
        {
          name: 'Customs Clearance Destination',
          planned_days: 2.5,
          trigger: 'previous_milestone'
        },
        { name: 'Delivery', planned_days: 3, trigger: 'previous_milestone' }
      ]
    }
  };
  
  return templates[serviceType] || templates['Ocean Export FCL'];
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  calculateMilestoneDate,
  getTimezoneOffset,
  formatDateInTimezone,
  createMilestonesFromTemplate,
  generatePreAlertChecklist,
  validateWorkflowProgress,
  calculateTransitTime,
  getMilestoneTemplate
};

// ============================================================================
// END OF workflow-utils.js
// ============================================================================

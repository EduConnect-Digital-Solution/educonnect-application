/**
 * Conflict Detection Engine
 * ───────────────────────────────
 * Pure, synchronous functions that run on every schedules[] mutation to give
 * real-time conflict feedback in the builder UI.
 *
 * DetectConflicts is intentionally O(n) with hash-map grouping — fast enough
 * for any realistic school timetable (< 400 slots / week).
 *
 * Conflict Types:
 *   TEACHER_DOUBLE_BOOKING — same teacher, same day+period, different classes
 *   ROOM_CONFLICT          — same room, same day+period, different classes
 *   PERIOD_DUPLICATION     — same class gets two subjects in the same period
 *   SUBJECT_OVERLOAD       — same subject appears > 2 times on same day (warning)
 *   MISSING_TEACHER        — a period block has no teacher assigned (warning)
 */

// ─── Types (JSDoc for IDE hints) ────────
/**
 * @typedef {Object} ScheduleEntry
 * @property {string}      id
 * @property {string}      classId
 * @property {string}      className
 * @property {string|null} armId       — null when the whole class shares one timetable
 * @property {string|null} armName
 * @property {string}      dayOfWeek
 * @property {string}      periodId
 * @property {number}      periodNumber
 * @property {string}      startTime
 * @property {string}      endTime
 * @property {string}      subjectId
 * @property {string}      subjectName
 * @property {string|null} teacherId
 * @property {string|null} teacherName
 * @property {string|null} roomId
 * @property {string|null} roomName
 */

/**
 * @typedef {Object} ConflictReport
 * @property {string}   id
 * @property {string}   type
 * @property {'error'|'warning'} severity
 * @property {string}   message
 * @property {string[]} affectedEntryIds
 */

// ─── Main export ────────────────
/**
 * Run all conflict checks against the current schedule entries.
 * @param {ScheduleEntry[]} schedules
 * @returns {ConflictReport[]}
 */
export function detectConflicts(schedules) {
  const conflicts = [];

  // ── 1. Teacher double-booking ───────
  // Same teacher in two different class+arm groups at the exact same slot.
  // armKey ensures "Grade 10A" and "Grade 10B" are treated as different groups.
  const byTeacherSlot = groupBy(
    schedules.filter(s => s.teacherId),
    s => `${s.teacherId}__${s.dayOfWeek}__${s.periodId}`
  );

  for (const [key, entries] of Object.entries(byTeacherSlot)) {
    const uniqueGroups = new Set(entries.map(e => `${e.classId}__${e.armId ?? ''}`));
    if (uniqueGroups.size > 1) {
      conflicts.push({
        id: `conflict_teacher_${key}`,
        type: 'TEACHER_DOUBLE_BOOKING',
        severity: 'error',
        message: `${entries[0].teacherName} is double-booked: assigned to ${uniqueGroups.size} groups at the same time on ${entries[0].dayOfWeek} Period ${entries[0].periodNumber}.`,
        affectedEntryIds: entries.map(e => e.id),
      });
    }
  }

  // ── 2. Room conflict ────────
  // Same room used by two different class+arm groups at the same slot.
  const byRoomSlot = groupBy(
    schedules.filter(s => s.roomId),
    s => `${s.roomId}__${s.dayOfWeek}__${s.periodId}`
  );

  for (const [key, entries] of Object.entries(byRoomSlot)) {
    const uniqueGroups = new Set(entries.map(e => `${e.classId}__${e.armId ?? ''}`));
    if (uniqueGroups.size > 1) {
      conflicts.push({
        id: `conflict_room_${key}`,
        type: 'ROOM_CONFLICT',
        severity: 'error',
        message: `${entries[0].roomName || 'A room'} is double-booked on ${entries[0].dayOfWeek} Period ${entries[0].periodNumber}.`,
        affectedEntryIds: entries.map(e => e.id),
      });
    }
  }

  // ── 3. Period duplication (same class+arm, same slot, two subjects) ───────
  // armId is included so arms of the same class can legitimately have
  // different subjects in the same period without triggering a conflict.
  const byClassArmSlot = groupBy(
    schedules,
    s => `${s.classId}__${s.armId ?? ''}__${s.dayOfWeek}__${s.periodId}`
  );

  for (const [key, entries] of Object.entries(byClassArmSlot)) {
    if (entries.length > 1) {
      const label = entries[0].armName
        ? `${entries[0].className} (${entries[0].armName})`
        : entries[0].className;
      conflicts.push({
        id: `conflict_dup_${key}`,
        type: 'PERIOD_DUPLICATION',
        severity: 'error',
        message: `${label}: ${entries.length} subjects assigned to the same period on ${entries[0].dayOfWeek} Period ${entries[0].periodNumber}.`,
        affectedEntryIds: entries.map(e => e.id),
      });
    }
  }

  // ── 4. Subject overload (same subject > 2 times on same day, per arm) ─────
  const byClassArmDaySubject = groupBy(
    schedules,
    s => `${s.classId}__${s.armId ?? ''}__${s.dayOfWeek}__${s.subjectId}`
  );

  for (const [key, entries] of Object.entries(byClassArmDaySubject)) {
    if (entries.length > 2) {
      const label = entries[0].armName
        ? `${entries[0].className} (${entries[0].armName})`
        : entries[0].className;
      conflicts.push({
        id: `conflict_overload_${key}`,
        type: 'SUBJECT_OVERLOAD',
        severity: 'warning',
        message: `${entries[0].subjectName} appears ${entries.length} times on ${entries[0].dayOfWeek} for ${label}. Consider redistributing across the week.`,
        affectedEntryIds: entries.map(e => e.id),
      });
    }
  }

  // ── 5. Missing teacher (warning) ─────
  const unassigned = schedules.filter(s => !s.teacherId);
  if (unassigned.length > 0) {
    conflicts.push({
      id: 'conflict_missing_teachers',
      type: 'MISSING_TEACHER',
      severity: 'warning',
      message: `${unassigned.length} period slot${unassigned.length > 1 ? 's' : ''} ${unassigned.length > 1 ? 'have' : 'has'} no teacher assigned.`,
      affectedEntryIds: unassigned.map(e => e.id),
    });
  }

  return conflicts;
}

/**
 * Returns a Set of entry IDs that are involved in at least one error-level conflict.
 * Used to draw red highlighting on the grid.
 * @param {ConflictReport[]} conflicts
 * @returns {Set<string>}
 */
export function getConflictedEntryIds(conflicts) {
  const ids = new Set();
  for (const c of conflicts) {
    if (c.severity === 'error') {
      c.affectedEntryIds.forEach(id => ids.add(id));
    }
  }
  return ids;
}

/**
 * Returns a Set of entry IDs that have warnings (no errors).
 * @param {ConflictReport[]} conflicts
 * @returns {Set<string>}
 */
export function getWarnedEntryIds(conflicts) {
  const ids = new Set();
  for (const c of conflicts) {
    if (c.severity === 'warning') {
      c.affectedEntryIds.forEach(id => ids.add(id));
    }
  }
  return ids;
}

/**
 * Returns true if there are any error-level conflicts (blocks publish).
 * @param {ConflictReport[]} conflicts
 */
export function hasBlockingConflicts(conflicts) {
  return conflicts.some(c => c.severity === 'error');
}

// ─── Utils ──────────────────────
function groupBy(arr, keyFn) {
  const result = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

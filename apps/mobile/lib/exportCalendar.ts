/**
 * exportCalendar.ts
 * Generates .ics (iCalendar) content from Schedule[] and shares it.
 * Works with Apple Calendar, Google Calendar, Outlook, etc.
 */

import { Platform, Share } from 'react-native';
import { Schedule } from '../store/scheduleStore';

// ── ICS helpers ──────────────────────────────────────────────────────────────

function toICSDate(isoString: string): string {
  // "2024-05-15T09:00:00.000Z" → "20240515T090000Z"
  return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', 'Z');
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC 5545: lines > 75 chars must be folded with CRLF + space
  if (line.length <= 75) return line;
  let result = '';
  let remaining = line;
  while (remaining.length > 75) {
    result += remaining.slice(0, 75) + '\r\n ';
    remaining = remaining.slice(75);
  }
  result += remaining;
  return result;
}

export function generateICS(schedules: Schedule[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ourplan//Ourplan App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Ourplan',
    'X-WR-TIMEZONE:Asia/Bangkok',
  ];

  for (const s of schedules) {
    const dtstart = toICSDate(s.startDatetime);
    const dtend   = toICSDate(s.endDatetime);
    const now     = toICSDate(new Date().toISOString());

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${s.id}@ourplan.app`));
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(foldLine(`SUMMARY:${s.icon ? s.icon + ' ' : ''}${escapeICS(s.title)}`));
    if (s.description) lines.push(foldLine(`DESCRIPTION:${escapeICS(s.description)}`));
    if (s.location)    lines.push(foldLine(`LOCATION:${escapeICS(s.location)}`));
    lines.push(`CATEGORIES:${s.category.toUpperCase()}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ── Export & Share ────────────────────────────────────────────────────────────

export async function exportCalendarToShare(
  schedules: Schedule[],
  isThai = false,
): Promise<boolean> {
  if (schedules.length === 0) return false;

  const ics = generateICS(schedules);

  try {
    // Try expo-file-system + expo-sharing first (proper .ics file share)
    const FileSystem = require('expo-file-system');
    const Sharing   = require('expo-sharing');

    const available = await Sharing.isAvailableAsync();
    if (available) {
      const fileUri = FileSystem.cacheDirectory + 'ourplan_calendar.ics';
      await FileSystem.writeAsStringAsync(fileUri, ics, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/calendar',
        dialogTitle: isThai ? 'ส่งออกปฏิทิน Ourplan' : 'Export Ourplan Calendar',
        UTI: 'public.calendar',
      });
      return true;
    }
  } catch {
    // expo-file-system / expo-sharing not available — fall back to text share
  }

  // Fallback: share as plain text (works everywhere)
  try {
    await Share.share({
      message: ics,
      title: isThai ? 'ปฏิทิน Ourplan (.ics)' : 'Ourplan Calendar (.ics)',
    });
    return true;
  } catch {
    return false;
  }
}

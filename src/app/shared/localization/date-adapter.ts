import { Injectable, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MatDateFormats, NativeDateAdapter } from '@angular/material/core';

export const CARAMBOLA_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'YYYY-MM-DD',
    timeInput: 'HH:mm',
  },
  display: {
    dateInput: 'YYYY-MM-DD',
    monthYearLabel: 'YYYY-MM',
    dateA11yLabel: 'YYYY-MM-DD',
    monthYearA11yLabel: 'YYYY-MM',
    timeInput: 'HH:mm',
    timeOptionLabel: 'HH:mm',
  },
};

@Injectable()
export class CarambolaNativeDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (value instanceof Date) {
      return this.clone(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed.length === 0) {
        return null;
      }

      if (parseFormat === 'YYYY-MM-DD' || /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return this.parseDateString(trimmed);
      }

      if (parseFormat === 'HH:mm' || /^\d{2}:\d{2}$/.test(trimmed)) {
        return this.parseTimeString(trimmed);
      }
    }

    return super.parse(value, parseFormat);
  }

  override deserialize(value: unknown): Date | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed.length === 0) {
        return null;
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return this.parseDateString(trimmed);
      }
    }

    return super.deserialize(value);
  }

  override format(date: Date, displayFormat: unknown): string {
    if (!this.isValid(date)) {
      throw Error('CarambolaNativeDateAdapter: Cannot format an invalid date.');
    }

    switch (displayFormat) {
      case 'YYYY-MM-DD':
        return [
          date.getFullYear(),
          this.pad(date.getMonth() + 1),
          this.pad(date.getDate()),
        ].join('-');
      case 'YYYY-MM':
        return [
          date.getFullYear(),
          this.pad(date.getMonth() + 1),
        ].join('-');
      case 'HH:mm':
        return [
          this.pad(date.getHours()),
          this.pad(date.getMinutes()),
        ].join(':');
      default:
        return super.format(date, displayFormat as object);
    }
  }

  private parseDateString(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }

    if (month < 1 || month > 12 || day < 1) {
      return null;
    }

    const result = this.createDate(year, month - 1, day);

    if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
      return null;
    }

    return result;
  }

  private parseTimeString(value: string): Date | null {
    const match = /^(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
      return null;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    const result = this.today();
    result.setHours(hours, minutes, 0, 0);

    return result;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}

export function provideCarambolaDateAdapter(): Provider[] {
  return [
    {
      provide: DateAdapter,
      useClass: CarambolaNativeDateAdapter,
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: CARAMBOLA_DATE_FORMATS,
    },
  ];
}

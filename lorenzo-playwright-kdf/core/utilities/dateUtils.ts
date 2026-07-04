export function getCurrentTimeStamp(expectedFormat?: string): string {
    return formatDateTime(new Date(), expectedFormat || 'yyyymmddhhmmss');
}

export function formatDateTime(date: Date, expFormat: string): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    switch (expFormat.toLowerCase().trim()) {
        case 'dd/mm/yyyy':
        case '%d/%m/%y':
            return `${day}/${month}/${year}`;
        case 'dd/mm/yyyy hh:mm':
        case 'dd/mm/yyyy hh:mt':
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        case 'hh:mm':
            return `${hours}:${minutes}`;
        case 'ddmmyyyyhhmt':
            return `${day}${month}${year}${hours}${minutes}`;
        case 'yyyy/mm/dd/hh:mm':
            return `${year}/${month}/${day} ${hours}:${minutes}`;
        case 'yyyymmddhhmm':
            return `${year}${month}${day}${hours}${minutes}`;
        case 'yyyy/mm/dd/hh:mm:ss':
            return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        case 'yyyymmddhhmmss':
            return `${year}${month}${day}${hours}${minutes}${seconds}`;
        case 'mmhhss':
            return `${minutes}${hours}${seconds}`;
        case 'yyyy-mm-dd hh:mm':
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        case 'yyyy-mm-dd':
            return `${year}-${month}-${day}`;
        case 'hh:mm:ss':
            return `${hours}:${minutes}:${seconds}`;
        case 'isostring':
            return date.toISOString();
        case 'mm/dd/yyyy':
        case '%m/%d/%y':    
            return `${month}/${day}/${year}`;

        default:
            return `${day}/${month}/${year}`;
    }
}

export interface OffsetResult {
    value: number;
    unit: 'D' | 'W' | 'M' | 'Y' | 'H' | 'MT';
}

export function parseOffset(offset: string): OffsetResult {
    const match = offset.match(/^(\d+)(D|W|M|Y|H|MT)$/i);
    if (!match) {
        throw new Error(`Invalid offset format: ${offset}. Expected formats like '3D', '2W', '1M', '5Y', '4H', '30MT'`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2].toUpperCase() as OffsetResult['unit'];
    return { value, unit };
}

export function parseDateFromCustomFormat(dateStr: string): Date {
    const [datePart, timePart] = dateStr.trim().split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    let hours = 0, minutes = 0;

    if (timePart) {
        [hours, minutes] = timePart.split(':').map(Number);
    } else {
        const now = new Date();
        hours = now.getHours();
        minutes = now.getMinutes();
    }

    return new Date(year, month - 1, day, hours, minutes);
}

export function adjustDate(baseDate: string, offset: string, isFuture: boolean = true): Date {
    let date: Date;

    if (baseDate.toLowerCase() === '_current') {
        date = new Date();
    } else {
        date = parseDateFromCustomFormat(baseDate);
    }

    const { value, unit } = parseOffset(offset);
    const direction = isFuture ? 1 : -1;

    switch (unit) {
        case 'D':
            date.setDate(date.getDate() + direction * value);
            break;
        case 'W':
            date.setDate(date.getDate() + direction * value * 7);
            break;
        case 'M':
            date.setMonth(date.getMonth() + direction * value);
            break;
        case 'Y':
            date.setFullYear(date.getFullYear() + direction * value);
            break;
        case 'H':
            date.setHours(date.getHours() + direction * value);
            break;
        case 'MT':
            date.setMinutes(date.getMinutes() + direction * value);
            break;
        default:
            throw new Error(`Unsupported time unit: ${unit}`);
    }

    return date;
}

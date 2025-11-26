declare module 'solarhijri-js' {
  export function gregorianToSolarHijri(date: Date): {
    year: number;
    month: number;
    day: number;
    monthName: string;
    dayName: string;
  };
  
  export function solarHijriToGregorian(year: number, month: number, day: number): Date;
  
  export function isValidSolarHijriDate(year: number, month: number, day: number): boolean;
}













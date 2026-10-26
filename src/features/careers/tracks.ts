// Formal names of the three technology tracks, shared by every filter, badge and chart.
export type Track = 'ai' | 'dev' | 'game';
export const trackLabels: Record<Track, string> = { ai: 'ปัญญาประดิษฐ์ (AI)', dev: 'การพัฒนาซอฟต์แวร์', game: 'การพัฒนาเกม' };
export const trackFilters = [['all', 'ทั้งหมด'], ...Object.entries(trackLabels)] as [string, string][];

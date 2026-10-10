// Battle music: licensed tracks from OpenGameArt, re-encoded to 112 kbps MP3 in public/audio/battle.
// CC-BY tracks must keep this attribution visible (see /credits).
export type Track = { id: string; level: number; title: string; author: string; license: 'CC0' | 'CC-BY 3.0'; page: string; file: string };
export const tracks: Track[] = [
  { id: 'lv1', level: 1, title: 'msx_cutscene (Yo Frankie!)', author: 'Blender Foundation (apricot.blender.org)', license: 'CC-BY 3.0', page: 'https://opengameart.org/content/msxcutscene', file: '/audio/battle/lv1.mp3' },
  { id: 'lv2', level: 2, title: 'Soliloquy', author: 'Matthew Pablo', license: 'CC-BY 3.0', page: 'https://opengameart.org/content/soliloquy', file: '/audio/battle/lv2.mp3' },
  { id: 'lv3', level: 3, title: 'Mystical Theme', author: 'Alexandr Zhelanov', license: 'CC-BY 3.0', page: 'https://opengameart.org/content/mystical-theme', file: '/audio/battle/lv3.mp3' },
  { id: 'lv4', level: 4, title: 'Awake! (Megawall-10)', author: 'cynicmusic', license: 'CC0', page: 'https://opengameart.org/content/awake-megawall-10', file: '/audio/battle/lv4.mp3' },
  { id: 'lv5', level: 5, title: "Fight Them Until We Can't", author: 'Zander Noriega', license: 'CC-BY 3.0', page: 'https://opengameart.org/content/fight-them-until-we-cant', file: '/audio/battle/lv5.mp3' },
  { id: 'lv6', level: 6, title: 'Magical Theme', author: 'remaxim', license: 'CC-BY 3.0', page: 'https://opengameart.org/content/magical-theme', file: '/audio/battle/lv6.mp3' },
  { id: 'lv7', level: 7, title: 'Dark Descent (Extended Cut)', author: 'Matthew Pablo', license: 'CC-BY 3.0', page: 'https://opengameart.org/content/dark-descent-extended-cut', file: '/audio/battle/lv7.mp3' },
  { id: 'lv8', level: 8, title: 'Breves dies hominis', author: 'Magdalen Kadel (uploaded by ceninan)', license: 'CC0', page: 'https://opengameart.org/content/breves-dies-hominis', file: '/audio/battle/lv8.mp3' },
];
export const licenseUrl: Record<Track['license'], string> = { 'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/', 'CC-BY 3.0': 'https://creativecommons.org/licenses/by/3.0/' };
export const trackFor = (id: string) => tracks.find(t => t.id === id);
/** Background music for the shop (CC0, no attribution required; credited anyway on /credits). */
export const shopTrack = { title: 'Town Theme RPG', author: 'cynicmusic', license: 'CC0' as const, page: 'https://opengameart.org/content/town-theme-rpg', file: '/audio/shop.mp3' };

/* ============================================================
   Sri Siri Home Foods — stroke line icon set
   ============================================================ */
const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9',
  shop: 'M4 8h16l-1 12H5L4 8Zm4 0a4 4 0 0 1 8 0',
  cart: 'M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  box: 'M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5',
  wallet: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm13 4h4v4h-4a2 2 0 0 1 0-4Z',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a3 3 0 1 0 0-6M3 20a6 6 0 0 1 12 0m1-6a6 6 0 0 1 5 6',
  truck: 'M3 6h11v9H3V6Zm11 3h4l3 3v3h-7V9ZM7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  tag: 'M3 12V4h8l9 9-8 8-9-9Zm5-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  chart: 'M4 20V4m0 16h16M8 16v-5m4 5V8m4 8v-3',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-1.6-.6.4-1.7-1.3-1.3-1.7.4L14.5 6 12 5.5 9.5 6l-.6 1.5-1.7-.4L5.9 8.4l.4 1.7L4.7 11l.5 2.5L4.7 15l1.6.6-.4 1.7 1.3 1.3 1.7-.4.6 1.5 2.5.5 2.5-.5.6-1.5 1.7.4 1.3-1.3-.4-1.7L20 12Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm6-2 4 4',
  chevR: 'm9 6 6 6-6 6',
  chevL: 'm15 6-6 6 6 6',
  chevD: 'm6 9 6 6 6-6',
  back: 'M19 12H5m6-7-7 7 7 7',
  close: 'M6 6 18 18M18 6 6 18',
  check: 'm4 12 5 5L20 6',
  checkCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-4-10 3 3 5-6',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm3 9a3 3 0 0 0 6 0',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.5l6.1-.9L12 3Z',
  heart: 'M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11Z',
  pin: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  phone: 'M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  map: 'm9 4 6 2 6-2v14l-6 2-6-2-6 2V6l6-2Zm0 0v14m6-12v14',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  fire: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2c1.5 0 1-3 2-5 .8 1 0 0 0 0Z',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14Zm0 0C9 15 12 12 16 9',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  rupee: 'M7 5h10M7 9h10M7 13h4a4 4 0 0 0 0-8M7 13l7 6',
  filter: 'M4 5h16l-6 7v6l-4 2v-8L4 5Z',
  edit: 'M5 19h14M14 4l4 4-9 9H5v-4l9-9Z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  camera: 'M5 8h3l1.5-2h5L16 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm7 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  google: 'M21 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  dots: 'M12 6h.01M12 12h.01M12 18h.01',
  trend: 'm4 16 5-5 4 3 7-8m0 0h-4m4 0v4',
};

export default function Icon({ name, size = 20, stroke = 2, fill = 'none', className, style }) {
  const d = PATHS[name] || '';
  const solidFill = name === 'star' || name === 'heart' || name === 'fire';
  return (
    <svg
      className={'icon ' + (className || '')}
      width={size} height={size} viewBox="0 0 24 24"
      fill={solidFill && fill === 'current' ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >
      <path d={d} />
    </svg>
  );
}

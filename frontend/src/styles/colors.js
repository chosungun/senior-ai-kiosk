// NIA 한국지능정보사회진흥원 색상 가이드라인 기반 색상 토큰
// 기본 모드: 대비 4.5:1 이상 / 고대비 모드: 7:1 이상

export const LIGHT = {
  // Surface
  bg:             '#F5F7FA',  // 페이지 배경
  card:           '#FFFFFF',  // 카드 배경
  cardAlt:        '#F8FAFC',  // 이미지·보조 배경
  border:         '#E2E8F0',  // 기본 구분선
  borderMid:      '#CBD5E1',  // 강조 구분선

  // Text
  text:           '#1E293B',  // 본문
  textSub:        '#475569',  // 보조
  textMuted:      '#94A3B8',  // 비활성

  // Primary (Blue)
  primary:        '#2563EB',
  primaryBg:      '#EFF6FF',
  primaryBgMid:   '#DBEAFE',
  primaryBorder:  '#93C5FD',
  primaryText:    '#FFFFFF',

  // Positive (Green)
  positive:       '#16A34A',
  positiveBg:     '#F0FDF4',
  positiveBorder: '#BBF7D0',
  positiveText:   '#FFFFFF',

  // Negative (Red)
  negative:       '#DC2626',
  negativeBg:     '#FEF2F2',
  negativeBorder: '#FECACA',
  negativeText:   '#FFFFFF',

  // Warning (Amber)
  warning:        '#D97706',
  warningBg:      '#FFFBEB',
  warningBorder:  '#FDE68A',
  warningText:    '#1E293B',

  // 음성·모달 오버레이
  overlay:        'rgba(15,23,42,0.94)',
  overlayCard:    'rgba(255,255,255,0.09)',
  overlayCardHi:  'rgba(59,130,246,0.14)',
  overlayBorder:  'rgba(255,255,255,0.12)',
  overlayText:    '#F1F5F9',
  overlayTextSub: '#94A3B8',
  overlayTextDim: '#475569',
  overlayPrimary: '#3B82F6',
  overlayAccent:  '#10B981',
}

export const HC = {
  // Surface
  bg:             '#000000',
  card:           '#0D0D0D',
  cardAlt:        '#0D0D0D',
  border:         '#454545',
  borderMid:      '#5D5D5D',

  // Text
  text:           '#FFFFFF',
  textSub:        '#CCCCCC',
  textMuted:      '#888888',

  // Primary (Yellow)
  primary:        '#FFE500',
  primaryBg:      '#1A1200',
  primaryBgMid:   '#2A1E00',
  primaryBorder:  '#806000',
  primaryText:    '#000000',

  // Positive (Bright Green)
  positive:       '#00E326',
  positiveBg:     '#001A06',
  positiveBorder: '#00A020',
  positiveText:   '#000000',

  // Negative (Light Red)
  negative:       '#FF6B6B',
  negativeBg:     '#2D0000',
  negativeBorder: '#CC0000',
  negativeText:   '#000000',

  // Warning (Bright Amber)
  warning:        '#FFC107',
  warningBg:      '#1A1200',
  warningBorder:  '#806000',
  warningText:    '#000000',

  // 음성·모달 오버레이
  overlay:        'rgba(0,0,0,0.97)',
  overlayCard:    'rgba(255,255,255,0.07)',
  overlayCardHi:  'rgba(255,229,0,0.10)',
  overlayBorder:  'rgba(255,255,255,0.14)',
  overlayText:    '#FFFFFF',
  overlayTextSub: '#AAAAAA',
  overlayTextDim: '#666666',
  overlayPrimary: '#FFE500',
  overlayAccent:  '#00E326',
}

export const getC = (highContrast) => highContrast ? HC : LIGHT

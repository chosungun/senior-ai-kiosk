// NIA 한국지능정보사회진흥원 타이포그래피 토큰 (27" 기준)
// 권장 서체: Pretendard Variable
// 가중치: Bold=700 / SemiBold=600 / Medium=500

export const FF = "'Pretendard Variable', Pretendard, 'Noto Sans KR', sans-serif"

// ── Heading ──────────────────────────────────────────────────────────
export const H = {
  LG: { fontSize: 70, fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.02em' },
  MD: { fontSize: 60, fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.02em' },
  SM: { fontSize: 50, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.02em' },
}

// ── Body SemiBold ─────────────────────────────────────────────────────
export const B = {
  XL: { fontSize: 46, fontWeight: 600, lineHeight: 1.4 },
  LG: { fontSize: 44, fontWeight: 600, lineHeight: 1.4 },
  MD: { fontSize: 40, fontWeight: 600, lineHeight: 1.4 },
  SM: { fontSize: 36, fontWeight: 600, lineHeight: 1.4 },
  XS: { fontSize: 32, fontWeight: 600, lineHeight: 1.4 },
}

// ── Body Medium ───────────────────────────────────────────────────────
export const BM = {
  XL: { fontSize: 46, fontWeight: 500, lineHeight: 1.4 },
  LG: { fontSize: 44, fontWeight: 500, lineHeight: 1.4 },
  MD: { fontSize: 40, fontWeight: 500, lineHeight: 1.4 },
  SM: { fontSize: 36, fontWeight: 500, lineHeight: 1.4 },
  XS: { fontSize: 32, fontWeight: 500, lineHeight: 1.4 },
}

// ── Label SemiBold ────────────────────────────────────────────────────
export const L = {
  XL: { fontSize: 60, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.02em' },
  LG: { fontSize: 50, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.02em' },
  MD: { fontSize: 44, fontWeight: 600, lineHeight: 1.4 },
  SM: { fontSize: 40, fontWeight: 600, lineHeight: 1.4 },
  XS: { fontSize: 36, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em' },
}

// ── Label Medium ──────────────────────────────────────────────────────
export const LM = {
  XL: { fontSize: 60, fontWeight: 500, lineHeight: 1.4, letterSpacing: '-0.02em' },
  LG: { fontSize: 50, fontWeight: 500, lineHeight: 1.4, letterSpacing: '-0.02em' },
  MD: { fontSize: 44, fontWeight: 500, lineHeight: 1.4 },
  SM: { fontSize: 40, fontWeight: 500, lineHeight: 1.4 },
  XS: { fontSize: 36, fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.02em' },
}

// ── Navigation ────────────────────────────────────────────────────────
export const NAV = {
  SB: { fontSize: 36, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em' },
  MD: { fontSize: 36, fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.02em' },
}

// ── Helper: lf(largeFont) 배율 적용 ──────────────────────────────────
export const sc = (token, lf) => ({ ...token, fontSize: token.fontSize * lf })

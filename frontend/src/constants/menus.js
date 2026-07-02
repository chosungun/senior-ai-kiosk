const HOT_ICE  = [{ label: 'HOT', price: 0 }, { label: 'ICE', price: 0 }]
const SIZE     = [{ label: '보통', price: 0 }, { label: '크게', price: 500 }]
const SHOT     = [{ label: '기본', price: 0 }, { label: '추가', price: 500 }]
const ICECREAM = [{ label: '없음', price: 0 }, { label: '추가', price: 1000 }]

export const FALLBACK = [
  // ── 커피 ──────────────────────────────────────────────────────────────
  { id: 1,  name: '아메리카노',      category: '커피',    price: 2000, img: '/menu/01_americano.png',         hasTemp: true,
    description: '쓴맛이 강하고 단맛은 거의 없어요. 진한 에스프레소를 물로 희석해 깔끔하게 즐길 수 있어요.',
    options: [{ name: '온도', choices: HOT_ICE }, { name: '사이즈', choices: SIZE }] },
  { id: 2,  name: '카페라떼',        category: '커피',    price: 3000, img: '/menu/02_cafe_latte.png',        hasTemp: true,
    description: '에스프레소에 우유를 넣어 부드럽고 고소해요. 쓴맛이 적고 은은한 단맛이 있어요.',
    options: [{ name: '온도', choices: HOT_ICE }, { name: '사이즈', choices: SIZE }] },
  { id: 3,  name: '바닐라라떼',      category: '커피',    price: 3500, img: '/menu/03_vanilla_latte.png',     hasTemp: true,
    description: '바닐라 시럽을 더해 달콤하고 향긋해요. 커피 향보다 바닐라 향이 도드라져 단맛을 좋아하시는 분께 잘 맞아요.',
    options: [{ name: '온도', choices: HOT_ICE }, { name: '샷', choices: SHOT }] },
  { id: 4,  name: '카라멜마키아토',  category: '커피',    price: 3800, img: '/menu/04_caramel_macchiato.png', hasTemp: true,
    description: '달콤한 카라멜 소스와 우유가 어우러져 꽤 달아요. 커피 쓴맛은 적고 디저트처럼 즐길 수 있어요.',
    options: [{ name: '온도', choices: HOT_ICE }, { name: '사이즈', choices: SIZE }] },
  { id: 5,  name: '카푸치노',        category: '커피',    price: 3300, img: '/menu/05_cappuccino.png',        hasTemp: true,
    description: '에스프레소에 우유 거품을 풍성하게 올렸어요. 쓴맛과 고소함이 균형 있고 거품이 부드러워요.',
    options: [{ name: '온도', choices: HOT_ICE }] },
  { id: 6,  name: '헤이즐넛라떼',    category: '커피',    price: 3500, img: '/menu/06_hazelnut_latte.png',    hasTemp: true,
    description: '헤이즐넛 시럽을 더해 고소하고 달콤해요. 견과류 향이 진하고 카페라떼보다 단맛이 강해요.',
    options: [{ name: '온도', choices: HOT_ICE }] },
  { id: 7,  name: '콜드브루',        category: '커피',    price: 3500, img: '/menu/07_cold_brew.png',         hasTemp: false,
    description: '차갑게 장시간 추출해 쓴맛이 적고 부드러워요. 단맛은 거의 없고 깔끔한 커피 향이 오래 남아요.',
    options: [{ name: '사이즈', choices: SIZE }] },
  { id: 8,  name: '아인슈페너',      category: '커피',    price: 4500, img: '/menu/08_einspanner.png',        hasTemp: false,
    description: '진한 에스프레소 위에 생크림을 얹은 비엔나 커피예요. 크림의 달콤함과 커피의 쓴맛이 한 번에 느껴져요.',
    options: [{ name: '샷', choices: SHOT }] },

  // ── 논커피 ────────────────────────────────────────────────────────────
  { id: 9,  name: '초코라떼',        category: '논커피',  price: 3500, img: '/menu/09_choco_latte.png',       hasTemp: true,
    description: '진한 초콜릿과 우유가 어우러져 달콤하고 묵직해요. 초콜릿 향이 풍부하고 달달한 음료를 좋아하시는 분께 잘 맞아요.',
    options: [{ name: '온도', choices: HOT_ICE }] },
  { id: 10, name: '그린티라떼',      category: '논커피',  price: 3500, img: '/menu/10_greentea_latte.png',    hasTemp: true,
    description: '말차 가루와 우유를 섞어 쌉쌀하면서도 고소해요. 단맛은 적당하고 녹차 특유의 향긋한 풀내음이 나요.',
    options: [{ name: '온도', choices: HOT_ICE }] },
  { id: 11, name: '딸기라떼',        category: '논커피',  price: 4000, img: '/menu/11_strawberry_latte.png',  hasTemp: true,
    description: '딸기 베이스에 우유를 더해 상큼하고 달콤해요. 과일 향이 풍부하고 새콤달콤한 맛이 특징이에요.',
    options: [{ name: '온도', choices: HOT_ICE }] },
  { id: 12, name: '고구마라떼',      category: '논커피',  price: 4000, img: '/menu/12_sweetpotato_latte.png', hasTemp: true,
    description: '구운 고구마 퓨레와 우유를 블렌딩해 고소하고 부드럽게 달아요. 구수한 고구마 향이 진하게 나요.',
    options: [{ name: '온도', choices: HOT_ICE }] },

  // ── 티/에이드 ─────────────────────────────────────────────────────────
  { id: 13, name: '자몽에이드',      category: '티/에이드', price: 3800, img: '/menu/13_grapefruit_ade.png',  hasTemp: false,
    description: '자몽의 새콤씁쓸한 맛에 탄산을 더해 청량감이 강해요. 단맛보다 새콤한 맛이 강하고 뒷맛이 살짝 쌉쌀해요.',
    options: [{ name: '사이즈', choices: SIZE }] },
  { id: 14, name: '레몬에이드',      category: '티/에이드', price: 3800, img: '/menu/14_lemon_ade.png',       hasTemp: false,
    description: '상큼한 레몬즙과 탄산이 어우러져 시원하고 새콤해요. 달콤하면서 레몬 특유의 상큼함이 살아 있어요.',
    options: [{ name: '사이즈', choices: SIZE }] },
  { id: 15, name: '청포도에이드',    category: '티/에이드', price: 3800, img: '/menu/15_greengrape_ade.png',  hasTemp: false,
    description: '청포도의 달콤한 향과 탄산이 만나 가볍고 청량해요. 새콤달콤하고 과일 향이 풍부해요.',
    options: [{ name: '사이즈', choices: SIZE }] },
  { id: 16, name: '캐모마일티',      category: '티/에이드', price: 3000, img: '/menu/16_chamomile_tea.png',   hasTemp: true,
    description: '카페인이 없는 꽃차로 달지 않고 은은하게 달콤한 꽃향기가 나요. 자극 없이 편안하게 즐기기 좋아요.',
    options: [] },

  // ── 디저트 ────────────────────────────────────────────────────────────
  { id: 17, name: '치즈케이크',      category: '디저트',  price: 4500, img: '/menu/17_cheesecake.png',        hasTemp: false,
    description: '진하고 부드러운 크림치즈 맛이 나요. 달콤하면서 치즈의 고소한 산미가 균형을 이뤄요.',
    options: [] },
  { id: 18, name: '크로플',          category: '디저트',  price: 3800, img: '/menu/18_croffle.png',           hasTemp: false,
    description: '크로아상 반죽을 와플 기계에 구워 겉은 바삭하고 속은 부드러워요. 버터 향이 진하고 고소하게 달아요.',
    options: [{ name: '아이스크림', choices: ICECREAM }] },
  { id: 19, name: '초코머핀',        category: '디저트',  price: 3000, img: '/menu/19_choco_muffin.png',      hasTemp: false,
    description: '촉촉한 초콜릿 반죽에 초코칩이 가득해요. 달콤하고 진한 초콜릿 맛이 나요.',
    options: [] },
  { id: 20, name: '마카롱 3구 세트', category: '디저트',  price: 5000, img: '/menu/20_macaron_set.png',       hasTemp: false,
    description: '당일 준비된 3가지 맛 마카롱이에요. 바삭한 꼬끄와 달콤한 필링이 조화로워요.',
    options: [] },
]

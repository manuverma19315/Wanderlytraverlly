// Pre-baked Gemma-style responses so the whole app can be demoed with no internet.

const it = (time, title, type, description, duration_min, cost, lat, lng, tip = '') =>
  ({ time, title, type, description, duration_min, cost, lat, lng, tip });

export const DEMO_TRIPS = {
  jaipur: {
    title: 'Royal Rajasthan: 3 Days in the Pink City',
    destination: 'Jaipur, Rajasthan, India',
    summary: 'Hilltop forts at golden hour, bustling bazaars and royal Rajasthani thalis. Days are clustered by area so you spend more time exploring and less time in traffic.',
    best_time: 'October to March (pleasant 15–28°C days)',
    currency: 'INR',
    center: { lat: 26.9239, lng: 75.8267 },
    tags: ['heritage', 'food', 'shopping', 'art'],
    days: [
      {
        day: 1, theme: 'Forts of the Aravallis',
        items: [
          it('08:00', 'Amber Fort', 'sight', 'Mirror-studded Sheesh Mahal and sweeping ramparts above Maota Lake. Arrive early to beat crowds and heat.', 150, 1000, 26.9855, 75.8513, 'Buy the composite ticket (₹1000 for foreigners / ₹100 for Indians) covering 8 monuments for 2 days.'),
          it('10:45', 'Panna Meena ka Kund', 'sight', 'A 16th-century stepwell with hypnotic criss-cross stairs, 5 minutes from Amber.', 40, 0, 26.9870, 75.8550, 'Sitting on the steps is not allowed—photos from the edge are best.'),
          it('11:45', 'Jaigarh Fort', 'sight', 'Home of Jaivana, once the world’s largest cannon on wheels, with views over Amber.', 90, 300, 26.9851, 75.8456),
          it('13:30', 'Lunch at 1135 AD', 'food', 'Regal dining inside Amber Fort serving laal maas and royal thalis.', 75, 3200, 26.9857, 75.8510, 'Reserve a window table for palace views.'),
          it('15:30', 'Jal Mahal viewpoint', 'sight', 'The “Water Palace” floating in Man Sagar Lake—quick photo stop on the way back.', 30, 0, 26.9535, 75.8462),
          it('17:00', 'Nahargarh Fort sunset', 'sight', 'The best sunset over Jaipur’s pink rooftops from the old fort walls.', 120, 400, 26.9373, 75.8155, 'Stay for dinner at Padao for city lights.'),
          it('19:30', 'Dinner at Padao Restaurant', 'food', 'Open-air rooftop on Nahargarh with twinkling city views.', 75, 1800, 26.9374, 75.8150),
        ],
      },
      {
        day: 2, theme: 'Old City Heritage Walk',
        items: [
          it('08:30', 'Hawa Mahal', 'sight', 'The iconic 953-window “Palace of Winds”. Morning light makes the pink sandstone glow.', 60, 200, 26.9239, 75.8267, 'Best photo from Wind View Café opposite the palace.'),
          it('09:45', 'Breakfast at Wind View Café', 'food', 'Masala chai and pyaz kachori with a front-row view of Hawa Mahal.', 45, 500, 26.9238, 75.8272),
          it('10:45', 'City Palace', 'sight', 'Still home to Jaipur’s royal family—don’t miss the four Peacock Gates in Pritam Niwas Chowk.', 120, 700, 26.9258, 75.8237),
          it('13:00', 'Jantar Mantar', 'sight', 'UNESCO-listed 18th-century observatory with the world’s largest stone sundial.', 60, 200, 26.9248, 75.8246, 'Hire an audio guide: the instruments are fascinating once explained.'),
          it('14:15', 'Lunch at LMB', 'food', 'Laxmi Mishthan Bhandar since 1727: try the paneer ghewar and Rajasthani thali.', 60, 1200, 26.9218, 75.8264),
          it('15:45', 'Johari Bazaar & Bapu Bazaar', 'shopping', 'Gemstones, block-printed textiles, mojaris and lac bangles.', 120, 2500, 26.9209, 75.8270, 'Bargain politely—start at 50% of the first price.'),
          it('18:30', 'Albert Hall Museum (lit up)', 'sight', 'Indo-Saracenic museum beautifully illuminated at night; Egyptian mummy inside.', 60, 300, 26.9116, 75.8195),
          it('20:00', 'Dinner at Spice Court', 'food', 'Famous for laal maas and dal baati churma in a cosy haveli setting.', 75, 1600, 26.9135, 75.8030),
        ],
      },
      {
        day: 3, theme: 'Temples, Gardens & Village Evening',
        items: [
          it('07:30', 'Galta Ji (Monkey Temple)', 'sight', 'Sacred natural springs in a rocky gorge, alive with langurs and macaques.', 90, 0, 26.9172, 75.8577, 'Walk up to the Sun Temple for a sunrise panorama.'),
          it('09:30', 'Breakfast at Rawat Mishthan Bhandar', 'food', 'Jaipur’s legendary pyaz kachori and mawa kachori.', 40, 300, 26.9235, 75.7970),
          it('10:45', 'Patrika Gate', 'sight', 'Jaipur’s most Instagrammed gate: every pillar painted in vivid Rajasthani motifs.', 45, 0, 26.8417, 75.8063, 'Closed on Mondays.'),
          it('12:00', 'Birla Mandir', 'sight', 'Serene white-marble Lakshmi Narayan temple with stained glass.', 45, 0, 26.8921, 75.8155),
          it('13:00', 'Lunch at Tapri Central', 'food', 'Rooftop chai bar with views of Central Park; try the maggi and kulhad chai.', 60, 800, 26.9006, 75.8045),
          it('15:00', 'Sisodia Rani Garden', 'sight', 'Tiered Mughal-style gardens with murals of Radha-Krishna.', 60, 100, 26.8937, 75.8890),
          it('18:00', 'Chokhi Dhani village resort', 'activity', 'Rajasthani village experience: folk dances, puppet shows, camel rides and an unlimited thali.', 210, 2400, 26.7672, 75.8358, 'Book online for evening slots; it gets busy on weekends.'),
        ],
      },
    ],
    budget: { stay: 12000, food: 9500, transport: 4500, activities: 5600, misc: 2000, total: 33600 },
    tips: [
      'Hire an auto or cab for half-days (₹800–1200) instead of point-to-point rides.',
      'Carry a scarf and comfortable shoes—fort ramparts are steep and temples need covered shoulders.',
      'Download offline Google Maps for the walled city; lanes are confusing.',
      'Most monuments open 9:00–17:00; Amber also has a light & sound show at 18:30.',
    ],
  },

  goa: {
    title: 'Sun, Sand & Susegad: 4 Days in Goa',
    destination: 'Goa, India',
    summary: 'North Goa beaches and nightlife, Portuguese heritage in Panaji and Old Goa, and a slow day on the dreamy southern coast.',
    best_time: 'November to February (dry, 22–32°C)',
    currency: 'INR',
    center: { lat: 15.45, lng: 73.85 },
    tags: ['beach', 'nightlife', 'food', 'heritage'],
    days: [
      {
        day: 1, theme: 'North Goa Beach Hop',
        items: [
          it('09:00', 'Fort Aguada', 'sight', '17th-century Portuguese fort and lighthouse guarding the Mandovi estuary.', 75, 0, 15.4920, 73.7735),
          it('10:45', 'Candolim Beach', 'activity', 'Wide, relaxed beach—perfect for a first swim and parasailing.', 120, 1500, 15.5180, 73.7620, 'Parasailing ≈ ₹1000–1500 per person.'),
          it('13:30', 'Lunch at Britto’s, Baga', 'food', 'Classic beach shack for Goan fish thali and bebinca.', 75, 1600, 15.5560, 73.7510),
          it('15:30', 'Baga Beach water sports', 'activity', 'Jet-ski and banana boat rides on Goa’s liveliest beach.', 120, 2000, 15.5553, 73.7517),
          it('19:00', 'Sunset at Baga Creek', 'sight', 'Quieter northern end of Baga with river-meets-sea views.', 45, 0, 15.5605, 73.7505),
          it('21:00', 'Tito’s Lane nightlife', 'activity', 'Goa’s most famous party strip with clubs and live music.', 150, 2500, 15.5547, 73.7537),
        ],
      },
      {
        day: 2, theme: 'Portuguese Heritage Trail',
        items: [
          it('09:00', 'Basilica of Bom Jesus', 'sight', 'UNESCO World Heritage baroque church holding the relics of St. Francis Xavier.', 60, 0, 15.5009, 73.9116),
          it('10:15', 'Se Cathedral', 'sight', 'One of Asia’s largest churches, home to the “Golden Bell”.', 45, 0, 15.5039, 73.9123),
          it('12:00', 'Our Lady of Immaculate Conception Church', 'sight', 'Panaji’s dazzling white zig-zag staircase church.', 30, 0, 15.4986, 73.8293),
          it('12:45', 'Fontainhas Latin Quarter walk', 'sight', 'Colourful Portuguese houses, azulejo tiles and art galleries.', 90, 0, 15.4960, 73.8320, 'Look for Gallery Gitanjali and the Panjim Inn.'),
          it('14:15', 'Lunch at Viva Panjim', 'food', 'Home-style Goan food: xacuti, recheado mackerel and sol kadhi.', 75, 1400, 15.4970, 73.8318),
          it('17:30', 'Mandovi River sunset cruise', 'activity', 'One-hour cruise with Goan folk dance performances on deck.', 60, 1000, 15.5008, 73.8302),
        ],
      },
      {
        day: 3, theme: 'Hippie Trail: Anjuna & Vagator',
        items: [
          it('10:00', 'Anjuna Flea Market', 'shopping', 'Wednesday market for boho clothes, jewellery and spices (other days: Anjuna beach cafés).', 120, 2000, 15.5735, 73.7406),
          it('12:30', 'Lunch at Gunpowder, Assagao', 'food', 'South Indian & Goan dishes in a leafy courtyard—try the pork vindaloo.', 75, 1800, 15.5938, 73.7663),
          it('15:00', 'Chapora Fort', 'sight', 'The “Dil Chahta Hai” fort with panoramic views over Vagator.', 60, 0, 15.6060, 73.7360, 'Wear shoes with grip—the path is rocky.'),
          it('16:30', 'Vagator Beach', 'activity', 'Red cliffs and the Shiva face rock carving at Little Vagator.', 90, 0, 15.6007, 73.7334),
          it('18:30', 'Sunset dinner at Thalassa', 'food', 'Greek taverna on the cliffs—famous for sunsets and fire shows.', 120, 3000, 15.5980, 73.7390, 'Book ahead; sunset tables sell out.'),
        ],
      },
      {
        day: 4, theme: 'Slow South Goa',
        items: [
          it('09:00', 'Drive to Cabo de Rama Fort', 'transport', 'Scenic 1.5-hour drive south through paddy fields and villages.', 90, 2200, 15.0889, 73.9192),
          it('10:30', 'Cabo de Rama Fort', 'sight', 'Clifftop fort with a tiny church and dramatic sea views.', 60, 0, 15.0889, 73.9192),
          it('12:00', 'Agonda Beach', 'activity', 'Quiet turtle-nesting beach—perfect for a long swim.', 120, 0, 15.0447, 73.9866),
          it('14:15', 'Lunch at Palolem shacks', 'food', 'Fresh catch of the day grilled with recheado masala.', 75, 1500, 15.0100, 74.0232),
          it('16:00', 'Boat trip to Butterfly Beach', 'activity', 'Dolphin-spotting boat ride to a hidden cove.', 120, 800, 15.0175, 74.0110),
          it('19:00', 'Silent noise party, Palolem', 'activity', 'Headphone party on the beach—three DJs, one dance floor.', 150, 1500, 15.0090, 74.0240),
        ],
      },
    ],
    budget: { stay: 18000, food: 12000, transport: 7000, activities: 9500, misc: 2500, total: 49000 },
    tips: [
      'Rent a scooter (₹350–500/day) — the easiest way to beach hop. Carry your licence.',
      'Shacks close in monsoon (June–September); plan beach days in winter.',
      'Respect red flags on beaches: currents can be strong.',
      'Try feni, bebinca and a proper Goan fish curry rice at least once.',
    ],
  },
};

export const DEMO_DISCOVER = {
  persona: 'Heritage Foodie',
  persona_desc: 'You love stories carved in stone and plates full of local flavour—slow mornings, rich evenings.',
  destinations: [
    { name: 'Udaipur', country: 'India', emoji: '🛶', match: 96, why: 'Lake palaces, rooftop dinners and a slower pace match your relaxed-but-curious style.', best_season: 'Oct–Mar', budget_per_day: '₹4,000–6,000', highlights: ['City Palace', 'Boat ride on Lake Pichola', 'Bagore ki Haveli dance show'], tags: ['heritage', 'relaxation', 'food'], lat: 24.5854, lng: 73.7125, hidden_gem: false },
    { name: 'Hampi', country: 'India', emoji: '🪨', match: 91, why: 'Explore 14th-century ruins by bicycle and watch sunsets from boulder hills.', best_season: 'Nov–Feb', budget_per_day: '₹2,000–3,500', highlights: ['Vittala Temple stone chariot', 'Coracle ride on Tungabhadra', 'Matanga Hill sunrise'], tags: ['heritage', 'adventure'], lat: 15.335, lng: 76.46, hidden_gem: true },
    { name: 'Varanasi', country: 'India', emoji: '🪔', match: 88, why: 'Spiritual rituals by the Ganga and legendary street food like kachori-sabzi and malaiyyo.', best_season: 'Oct–Mar', budget_per_day: '₹2,500–4,000', highlights: ['Ganga aarti at Dashashwamedh', 'Sunrise boat ride', 'Kashi Vishwanath corridor'], tags: ['spiritual', 'food', 'heritage'], lat: 25.3176, lng: 82.9739, hidden_gem: false },
    { name: 'Istanbul', country: 'Türkiye', emoji: '🕌', match: 85, why: 'Byzantine and Ottoman wonders plus the world’s best breakfast culture.', best_season: 'Apr–Jun, Sep–Nov', budget_per_day: '₹7,000–10,000', highlights: ['Hagia Sophia', 'Bosphorus ferry', 'Grand Bazaar'], tags: ['heritage', 'food', 'shopping'], lat: 41.0082, lng: 28.9784, hidden_gem: false },
    { name: 'Pondicherry', country: 'India', emoji: '🥐', match: 82, why: 'French-Tamil fusion food and colourful heritage streets you can explore on foot.', best_season: 'Oct–Mar', budget_per_day: '₹3,000–5,000', highlights: ['White Town walk', 'Auroville', 'Promenade Beach'], tags: ['food', 'heritage', 'beach'], lat: 11.9416, lng: 79.8083, hidden_gem: false },
    { name: 'Hanoi', country: 'Vietnam', emoji: '🍜', match: 79, why: 'Old Quarter food tours and French-colonial architecture at a backpacker budget.', best_season: 'Oct–Apr', budget_per_day: '₹3,500–5,500', highlights: ['Old Quarter street food', 'Hoan Kiem Lake', 'Train Street'], tags: ['food', 'heritage'], lat: 21.0278, lng: 105.8342, hidden_gem: false },
  ],
};

export const DEMO_NEARBY = {
  label: 'India Gate, New Delhi',
  center: { lat: 28.6129, lng: 77.2295 },
  source: 'places+gemma',
  data: {
    area_summary: 'You are at the heart of Lutyens’ Delhi—grand boulevards, Mughal tombs and lush gardens are all within a short auto ride.',
    places: [
      { name: 'India Gate', category: 'heritage', distance_km: 0.1, lat: 28.6129, lng: 77.2295, hook: 'A 42m war memorial arch that glows beautifully after sunset.', best_time: 'After 7 pm', time_needed: '30 min', must_see: true, tags: ['heritage'] },
      { name: 'National War Memorial', category: 'heritage', distance_km: 0.4, lat: 28.6127, lng: 77.2330, hook: 'Moving concentric circles honouring 26,000 soldiers—catch the retreat ceremony.', best_time: 'Evening', time_needed: '45 min', must_see: true, tags: ['heritage'] },
      { name: 'National Museum', category: 'museum', distance_km: 1.0, lat: 28.6119, lng: 77.2194, hook: '5,000 years of Indian art, from Harappan seals to Mughal miniatures.', best_time: 'Morning', time_needed: '2 hrs', must_see: true, tags: ['art', 'heritage'] },
      { name: 'Purana Qila', category: 'heritage', distance_km: 1.6, lat: 28.6096, lng: 77.2437, hook: 'One of Delhi’s oldest forts with boating in its moat.', best_time: 'Late afternoon', time_needed: '1.5 hrs', must_see: false, tags: ['heritage'] },
      { name: 'Agrasen ki Baoli', category: 'heritage', distance_km: 1.6, lat: 28.6262, lng: 77.2250, hook: 'A mysterious 108-step stepwell hidden between office towers.', best_time: 'Morning', time_needed: '30 min', must_see: false, tags: ['heritage'] },
      { name: 'Gurudwara Bangla Sahib', category: 'spiritual', distance_km: 2.3, lat: 28.6264, lng: 77.2091, hook: 'Golden-domed Sikh shrine—join the free community langar meal.', best_time: 'Lunchtime', time_needed: '1 hr', must_see: true, tags: ['spiritual', 'food'] },
      { name: 'Rashtrapati Bhavan', category: 'heritage', distance_km: 2.9, lat: 28.6143, lng: 77.1994, hook: 'The President’s 340-room palace—book the Mughal Gardens tour.', best_time: 'Morning (book ahead)', time_needed: '2 hrs', must_see: false, tags: ['heritage'] },
      { name: 'Humayun’s Tomb', category: 'heritage', distance_km: 3.0, lat: 28.5933, lng: 77.2507, hook: 'The red-sandstone tomb that inspired the Taj Mahal.', best_time: 'Golden hour', time_needed: '1.5 hrs', must_see: true, tags: ['heritage', 'art'] },
      { name: 'Sunder Nursery', category: 'nature', distance_km: 2.6, lat: 28.5966, lng: 77.2440, hook: '90 acres of restored Mughal gardens, perfect for a picnic.', best_time: 'Morning', time_needed: '1 hr', must_see: false, tags: ['nature'] },
      { name: 'Lodhi Garden', category: 'nature', distance_km: 2.5, lat: 28.5931, lng: 77.2197, hook: '15th-century tombs scattered across Delhi’s favourite jogging park.', best_time: 'Early morning', time_needed: '1 hr', must_see: false, tags: ['nature', 'heritage'] },
      { name: 'Hazrat Nizamuddin Dargah', category: 'spiritual', distance_km: 3.3, lat: 28.5913, lng: 77.2419, hook: 'Soul-stirring qawwali every Thursday evening.', best_time: 'Thursday after sunset', time_needed: '1 hr', must_see: false, tags: ['spiritual'] },
      { name: 'Connaught Place', category: 'attraction', distance_km: 2.1, lat: 28.6315, lng: 77.2167, hook: 'Georgian colonnades packed with cafés, shops and nightlife.', best_time: 'Evening', time_needed: '2 hrs', must_see: false, tags: ['shopping', 'food', 'nightlife'] },
    ],
  },
};

export const DEMO_LENS = [
  {
    id: 'taj', image: '/static/img/sample-taj.svg', label: 'Monument',
    data: {
      kind: 'landmark', name: 'Taj Mahal', confidence: 97, location: 'Agra, Uttar Pradesh, India',
      summary: 'A white-marble mausoleum on the banks of the Yamuna and one of the New Seven Wonders of the World.',
      history: 'Commissioned in 1632 by Mughal emperor Shah Jahan in memory of his wife Mumtaz Mahal, it took around 20,000 artisans about 22 years to complete. Its perfect symmetry, pietra dura inlay and calligraphy make it the jewel of Mughal architecture.',
      fun_facts: ['The four minarets lean slightly outward so they would fall away from the tomb in an earthquake.', 'The marble changes colour—pinkish at dawn, white at noon, golden under moonlight.', 'The calligraphy gets larger towards the top so it appears uniform from below.'],
      visit_tips: ['Arrive at sunrise via the East Gate for the shortest queue.', 'Closed on Fridays; night viewing on 5 nights around full moon.', 'Only water bottles and phones allowed—leave food and tripods at the hotel.'],
      nearby: [{ name: 'Agra Fort', why: 'Red sandstone fort where Shah Jahan was imprisoned, 2.5 km away.' }, { name: 'Mehtab Bagh', why: 'Garden across the river with the best sunset view of the Taj.' }, { name: 'Itmad-ud-Daulah', why: 'The “Baby Taj”—a delicate marble tomb.' }],
      text_found: '', translation: '', tags: ['heritage', 'art'],
      follow_up_questions: ['How much is the entry ticket?', 'Best photo spots?', 'Can I visit the Taj at night?'],
    },
  },
  {
    id: 'food', image: '/static/img/sample-panipuri.svg', label: 'Street food',
    data: {
      kind: 'food', name: 'Pani Puri (Golgappa)', confidence: 93, location: 'Popular across India (origin: Uttar Pradesh / Bihar)',
      summary: 'Crispy hollow puris filled with spiced potato and chickpeas, dunked in tangy tamarind and mint water.',
      history: 'Hand-rolled semolina or wheat discs are deep-fried until they puff up. Each vendor has a secret recipe for the “pani”—usually mint, coriander, tamarind, black salt and roasted cumin. It is eaten in one bite, standing at the cart, as the vendor serves one at a time.',
      fun_facts: ['It has at least five regional names: golgappa, puchka, gupchup, pani ke batashe and pani puri.', 'Kolkata’s puchka uses tamarind water and mashed potato with more chilli.', 'Some vendors offer six flavours of water, from hing to pudina.'],
      visit_tips: ['Pick busy stalls—high turnover means fresh water.', 'Ask for “meetha” (sweet) or “teekha” (spicy).', 'Finish with a “sukha puri” — a dry one with masala — it’s free!'],
      nearby: [{ name: 'Chandni Chowk, Delhi', why: 'Iconic street-food lane.' }, { name: 'Juhu Beach, Mumbai', why: 'Famous chaat stalls by the sea.' }, { name: 'Vardaan Market, Kolkata', why: 'Legendary puchka stalls.' }],
      text_found: '', translation: '', tags: ['food'],
      follow_up_questions: ['Is it safe for tourists?', 'Vegan version?', 'Where is the best pani puri in Delhi?'],
    },
  },
  {
    id: 'sign', image: '/static/img/sample-sign.svg', label: 'Hindi sign',
    data: {
      kind: 'sign', name: 'Welcome sign — Jaipur city gate', confidence: 90, location: 'Jaipur, Rajasthan, India',
      summary: 'A Hindi welcome board at an entrance to Jaipur’s walled city, with a reminder to keep the heritage area clean.',
      history: 'Jaipur was painted terracotta pink in 1876 to welcome the Prince of Wales; it is now a law to keep the old city pink. Signs like this appear at the historic gates such as Ajmeri Gate and Sanganeri Gate.',
      fun_facts: ['Jaipur is India’s first planned city, laid out using Vastu Shastra in 1727.', 'The walled city is a UNESCO World Heritage Site since 2019.', '“Padharo Mhare Des” means “Welcome to my land” in Rajasthani.'],
      visit_tips: ['The walled city is best explored on foot or by e-rickshaw.', 'Shops in the bazaars open around 11 am.', 'Many monuments are closed on public holidays—check before visiting.'],
      nearby: [{ name: 'Hawa Mahal', why: 'The iconic Palace of Winds, 1 km inside the walls.' }, { name: 'Johari Bazaar', why: 'Jewellery and textile market.' }, { name: 'City Palace', why: 'Royal residence and museum.' }],
      text_found: 'गुलाबी नगर जयपुर में आपका स्वागत है\nपधारो म्हारे देस\nकृपया शहर को स्वच्छ रखें',
      translation: 'Welcome to the Pink City, Jaipur\n“Come to my land” (Rajasthani greeting)\nPlease keep the city clean',
      tags: ['heritage'],
      follow_up_questions: ['How do I say “thank you” in Hindi?', 'Which gate is closest to Hawa Mahal?', 'Why is Jaipur pink?'],
    },
  },
];

export function demoToolkit(destination = '') {
  const goa = /goa|beach|bali|maldives|andaman|phuket|krabi/i.test(destination);
  return {
    language: goa ? 'Konkani (Hindi & English widely spoken)' : 'Hindi (Rajasthani locally)',
    packing: [
      { category: 'Clothing', items: goa ? ['Swimwear ×2', 'Light cotton shirts', 'Sarong / cover-up', 'Flip-flops', 'Light jacket for night rides'] : ['Breathable cotton tops', 'Scarf / stole for temples', 'Comfortable walking shoes', 'Light sweater (winter evenings)', 'Sunglasses & cap'] },
      { category: 'Health & hygiene', items: ['SPF 50 sunscreen', 'ORS sachets', 'Hand sanitiser', 'Basic meds (antacid, paracetamol)', 'Mosquito repellent'] },
      { category: 'Tech', items: ['Power bank', 'Universal adapter (Type C/D/M)', 'Offline maps downloaded', 'Phone with UPI app'] },
      { category: 'Documents', items: ['ID / passport + copies', 'Hotel bookings (offline)', 'Travel insurance', goa ? 'Driving licence for scooter' : 'Monument composite ticket'] },
      { category: 'Extras', items: goa ? ['Dry bag', 'Reusable water bottle', 'Waterproof phone pouch'] : ['Reusable water bottle', 'Small daypack', 'Cloth shopping bag for bazaars'] },
    ],
    phrases: [
      { en: 'Hello', local: 'नमस्ते (Namaste)', pronunciation: 'nuh-muh-STAY' },
      { en: 'Thank you', local: 'धन्यवाद (Dhanyavaad)', pronunciation: 'dhun-yuh-VAAD' },
      { en: 'How much is this?', local: 'यह कितने का है? (Yeh kitne ka hai?)', pronunciation: 'yeh KIT-nay kaa hai' },
      { en: 'Too expensive', local: 'बहुत महंगा है (Bahut mehenga hai)', pronunciation: 'buh-HOOT meh-HEN-gaa hai' },
      { en: 'Where is…?', local: '…कहाँ है? (…kahaan hai?)', pronunciation: 'kuh-HAAN hai' },
      { en: 'Not spicy, please', local: 'कम तीखा, प्लीज़ (Kam teekha, please)', pronunciation: 'kum TEE-khaa' },
      { en: 'Water', local: 'पानी (Paani)', pronunciation: 'PAA-nee' },
      { en: 'Help!', local: 'मदद! (Madad!)', pronunciation: 'MUH-dud' },
    ],
    etiquette: ['Remove shoes before entering temples and homes.', 'Use your right hand to give and receive things.', 'Ask before photographing people.', goa ? 'Beachwear is fine on the sand, cover up in towns and churches.' : 'Dress modestly at religious sites—shoulders and knees covered.'],
    safety: ['Use app cabs (Ola/Uber) or prepaid booths at stations.', 'Keep valuables in a zipped bag in crowded bazaars.', 'Drink sealed bottled water only.', goa ? 'Never swim when red flags are up or after drinking.' : 'Agree on auto fares before the ride starts.'],
    money_tips: ['UPI is accepted almost everywhere—even street stalls.', 'Carry some cash in small notes for tips and markets.', 'Monument tickets are cheaper online.', 'Lunch thalis are the best value meals.'],
    emergency: { police: '100 / 112', ambulance: '108', tourist_helpline: '1800-11-1363' },
  };
}

export const DEMO_CHAT_REPLIES = [
  { match: /budget|cheap|cost|money|price/i, reply: 'Here’s how to stretch your rupees 💸\n\n- **Stay** in heritage havelis or zostels (₹1,200–2,500/night)\n- **Eat** lunch thalis at local bhojanalayas (₹150–250)\n- **Composite tickets** save ~40% on monuments\n- **Move** by shared autos or app cabs for longer hops\n\nA comfortable mid-range day in Jaipur works out to around **₹3,500 per person**.' },
  { match: /food|eat|restaurant|dish|veg/i, reply: 'Must-try dishes 🍛\n\n- **Dal baati churma**: the Rajasthani classic\n- **Pyaz kachori** at Rawat Mishthan Bhandar\n- **Laal maas**: fiery mutton curry (non-veg)\n- **Ghewar**: honeycomb dessert, best at LMB\n- **Lassi** in a kulhad at Lassiwala, MI Road\n\nWant me to add a street-food walk to Day 2?' },
  { match: /weather|rain|hot|cold|season|when/i, reply: 'Best season is **October to March** 🌤️\n\n- Days: 20–28°C, nights can dip to 8°C in Dec–Jan\n- April–June gets very hot (40°C+); plan forts before 11 am\n- Monsoon (Jul–Sep) is green and quiet, with short showers\n\nPack a light sweater for evenings in winter.' },
  { match: /safe|solo|women|night/i, reply: 'Generally very safe for travellers 🛡️\n\n- Stick to app cabs at night and share your live location\n- Old-city bazaars are crowded; keep bags zipped\n- Dress modestly at religious sites\n- Emergency number: **112**\n\nSolo travellers love the hostel scene near MI Road.' },
  { match: /hidden|offbeat|gem|less crowded/i, reply: 'Some hidden gems 💎\n\n- **Panna Meena ka Kund**: geometric stepwell near Amber\n- **Galta Ji**: monkey temple in a rocky gorge\n- **Sisodia Rani Garden**: peaceful terraced gardens\n- **Chand Baori** (1.5 hrs away): one of India’s deepest stepwells\n\nVisit early morning for the best light and no crowds.' },
];
export const DEMO_CHAT_DEFAULT = 'Great question! ✨ Based on your trip, I’d suggest:\n\n- Start sightseeing early (8 am) to beat heat and crowds\n- Keep afternoons for museums and cafés\n- Save forts and viewpoints for golden hour\n\nAsk me about **food**, **budget**, **weather**, **safety** or **hidden gems** and I’ll go deeper!';

export function demoChatReply(text) {
  return (DEMO_CHAT_REPLIES.find(r => r.match.test(text)) || { reply: DEMO_CHAT_DEFAULT }).reply;
}

export const DEMO_CHAT_SCRIPT = [
  { role: 'user', content: 'I have 3 days in Jaipur in December. What should I not miss?' },
  { role: 'assistant', content: 'December is perfect—cool, sunny days! 🌤️ Don’t miss:\n\n- **Amber Fort** at 8 am before tour buses arrive\n- **Hawa Mahal** in morning light from Wind View Café\n- **Nahargarh** for sunset over the Pink City\n- **Chokhi Dhani** for a Rajasthani village dinner\n\nI’ve grouped these by area in your itinerary so you won’t backtrack.' },
  { role: 'user', content: 'Any vegetarian food recommendations?' },
  { role: 'assistant', content: 'Jaipur is a veggie paradise 🥗\n\n- **LMB**: royal thali + paneer ghewar\n- **Rawat**: pyaz kachori for breakfast\n- **Natraj**: aloo bakhar and kesar lassi\n- **Chokhi Dhani**: unlimited dal-baati-churma\n\nAsk for “kam teekha” if you prefer less spice!' },
];

// All programme content lives here, separate from the app logic.
// Techniques and book ideas are written in our own words and linked to the research they come from,
// so this file can later be reviewed by an expert or translated without touching the code.

const SOURCES = {
  lieberman2007: "Lieberman et al. (2007). Putting feelings into words: affect labeling disrupts amygdala activity. Psychological Science.",
  balban2023: "Balban et al. (2023). Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Reports Medicine.",
  gollwitzer1999: "Gollwitzer (1999). Implementation intentions: strong effects of simple plans. American Psychologist.",
  lally2010: "Lally et al. (2010). How are habits formed: modelling habit formation in the real world. European Journal of Social Psychology.",
  gross2003: "Gross & John (2003). Individual differences in two emotion regulation processes. Journal of Personality and Social Psychology.",
  bruehlman2015: "Bruehlman-Senecal & Ayduk (2015). This too shall pass: temporal distance and the regulation of emotional distress. JPSP.",
  kross2014: "Kross et al. (2014). Self-talk as a regulatory mechanism: how you do it matters. JPSP.",
  bushman2002: "Bushman (2002). Does venting anger feed or extinguish the flame? Personality and Social Psychology Bulletin.",
  zaccaro2018: "Zaccaro et al. (2018). How breath-control can change your life: a systematic review of slow breathing. Frontiers in Human Neuroscience.",
  linehan2015: "Linehan (2015). DBT Skills Training Manual, 2nd ed. (Opposite action, emotion regulation skills).",
  samhsa2019: "Reilly & Shopshire (2019). Anger Management for Substance Use Disorder and Mental Health Clients. SAMHSA (time-out and anger-control plans).",
  decastro2002: "de Castro et al. (2002). Hostile attribution of intent and aggressive behavior: a meta-analysis. Child Development.",
  ross1977: "Ross (1977). The intuitive psychologist and his shortcomings (fundamental attribution error). Advances in Experimental Social Psychology.",
  bond2006: "Bond & DePaulo (2006). Accuracy of deception judgments. Personality and Social Psychology Review.",
  kahneman2011: "Kahneman (2011). Thinking, Fast and Slow (System 1 / System 2).",
  pennebaker1997: "Pennebaker (1997). Writing about emotional experiences as a therapeutic process. Psychological Science.",
  tetlock2015: "Tetlock & Gardner (2015). Superforecasting: tracking predictions and scoring them improves judgement.",
  chartrand1999: "Chartrand & Bargh (1999). The chameleon effect: the perception-behavior link and social interaction. JPSP.",
  rogers1957: "Rogers & Farson (1957). Active Listening. Industrial Relations Center, University of Chicago.",
  friedman1974: "Friedman & Rosenman (1974). Type A Behavior and Your Heart (time urgency and hostility).",
  rosenberg2003: "Rosenberg (2003). Nonviolent Communication: A Language of Life (observation, feeling, need, request).",
  david2016: "David (2016). Emotional Agility.",
  // Yoga, pranayama and japa (the books in the "Yoga and Pranayama" folder, plus key studies)
  cyp: "Ministry of AYUSH, Government of India. Common Yoga Protocol, International Day of Yoga (Nadishodhana, Bhramari, Dhyana, Sankalpa).",
  iyengarLoP: "Iyengar, B.K.S. (1981). Light on Pranayama (What is Japa?; sama vrtti; Hints and Cautions).",
  sutra: "Patanjali, Yoga Sutra I.27–29: the sacred syllable (Om) is His designation; it is repeated with reflection on its meaning; from this comes inwardness and the removal of obstacles.",
  sivananda: "Swami Sivananda. The Science of Pranayama. Divine Life Society (sagarbha pranayama: breath practice joined with mental japa).",
  mandlik: "Mandlik, V. (Guruji). Yoga Therapy: A Practical Guide for the Twenty-first Century. Yoga Vidya Gurukul (heart patients: gentle breathing only, no retention or bandhas).",
  mayo: "Mayo Clinic staff. Meditation: a simple, fast way to reduce stress.",
  nccih2016: "NIH National Center for Complementary and Integrative Health (2016). Meditation: what you need to know.",
  evans: "Evans, J.M. How to Meditate: A Primer for Beginners.",
  bernardi2001: "Bernardi et al. (2001). Effect of rosary prayer and yoga mantras on autonomic cardiovascular rhythms: comparative study. BMJ.",
  goyal2014: "Goyal et al. (2014). Meditation programs for psychological stress and well-being: a systematic review and meta-analysis. JAMA Internal Medicine.",
  pramanik2010: "Pramanik et al. (2010). Immediate effect of a slow pace breathing exercise, Bhramari pranayama, on blood pressure and heart rate. Nepal Medical College Journal.",
  telles2014: "Telles, Sharma & Balkrishna (2014). Blood pressure and heart rate variability during yoga-based alternate nostril breathing practice and breath awareness. Medical Science Monitor Basic Research.",
};

// One principle is shown each morning, rotating through the list.
const PRINCIPLES = [
  { text: "Name it to tame it. Silently labelling what you feel (\"I'm feeling impatient\") measurably lowers its intensity.", src: "lieberman2007" },
  { text: "A long, slow exhale is the fastest physical brake on arousal you carry with you.", src: "balban2023" },
  { text: "Decide your response before the trigger arrives: \"If X happens, then I will do Y.\" Pre-made plans fire automatically.", src: "gollwitzer1999" },
  { text: "Missing one day does not break a habit. Missing two in a row starts a new one. Never miss twice.", src: "lally2010" },
  { text: "Changing how you interpret a situation works better than suppressing the feeling afterwards.", src: "gross2003" },
  { text: "Ask: \"Will this matter in a week? A year?\" Imagining the future shrinks today's distress.", src: "bruehlman2015" },
  { text: "Talk to yourself in the third person (\"Why is [your name] so upset?\"). Distance brings calm and clearer thinking.", src: "kross2014" },
  { text: "Venting anger does not release it; it rehearses it. Calm the body first, discuss later.", src: "bushman2002" },
  { text: "Slower breathing slows your speech, lowers your voice and gives your thinking time to catch up.", src: "zaccaro2018" },
  { text: "Opposite action: when anger says attack, act gently; when hurt says withdraw, gently re-engage.", src: "linehan2015" },
  { text: "A planned time-out is a skill, not a defeat: name it, step away, set a time, come back.", src: "samhsa2019" },
  { text: "When someone's behaviour annoys you, list two innocent explanations before assuming bad intent.", src: "decastro2002" },
  { text: "We blame people's character for what is often their situation. Ask what pressure they are under.", src: "ross1977" },
  { text: "No single gesture means one thing. Notice changes from a person's normal behaviour, then ask, don't assume.", src: "bond2006" },
  { text: "Your first read is fast and confident (System 1). Before acting on it, ask what the actual evidence is (System 2).", src: "kahneman2011" },
  { text: "A few minutes of writing about what upset you helps your mind file it away instead of looping on it.", src: "pennebaker1997" },
  { text: "Write your read of a person down, then check it later. Scoring your guesses is how judgement actually improves.", src: "tetlock2015" },
  { text: "Subtly matching someone's pace and tone builds rapport, and people who feel at ease show you more of themselves.", src: "chartrand1999" },
  { text: "Listen to understand, not to reply. You can't read someone while you're busy planning your next sentence.", src: "rogers1957" },
  { text: "Hurry and irritation feed each other. Most delays you fight today will not matter next week.", src: "friedman1974" },
  { text: "Say what you saw, what you feel and what you need, without blame. It gets you heard instead of resisted.", src: "rosenberg2003" },
  { text: "Feelings are data, not directions. Notice them, name them, then act on what you value.", src: "david2016" },
  { text: "Japa gathers a scattered mind onto one thought. Repeat the mantra slowly, and let its meaning, not the count, hold your attention.", src: "sutra" },
  { text: "Reciting a mantra or rosary slows breathing to about six breaths a minute, the rhythm at which heart and breath fall into step.", src: "bernardi2001" },
  { text: "Bhramari: a long humming exhale soothes the mind and nervous system and eases anger and restlessness.", src: "cyp" },
  { text: "Never force the breath. Proceed step by step; pranayama done hastily or forcibly does harm.", src: "iyengarLoP" },
];

// The 41-day cycle follows the weekly drills of the programme:
// days 1–21 focus inward (your own breath, voice and patience), days 22–41 focus outward (reading others).
const PHASES = [
  {
    from: 1, to: 7, name: "Voice & breath", stage: "Internal",
    assignment: "Keep your voice slightly lower than the other person's in every conversation. Notice each time you speed up.",
    focuses: [
      "Keep my voice slightly lower and slower than the other person's",
      "One slow exhale before every reply when I feel irritated",
      "Notice the first body sign of anger (jaw, chest, heat)",
      "Shoulders down, feet flat when a conversation gets tense",
    ],
  },
  {
    from: 8, to: 14, name: "Patience & delegation", stage: "Internal",
    assignment: "Hand over one task and let it finish without correcting or rushing. Notice the frustration in your body without acting on it.",
    focuses: [
      "Let one non-critical task move at someone else's pace without stepping in",
      "Before chasing a delay, ask: will this matter in 7 days?",
      "Hand over a task and don't correct it until it's finished",
      "Say \"when could this be done?\" instead of \"why isn't this done?\"",
    ],
  },
  {
    from: 15, to: 21, name: "Trigger deconstruction", stage: "Internal",
    assignment: "Whenever you feel the urge to sulk or snap, write down the exact unmet expectation within 10 minutes.",
    focuses: [
      "Name the unmet expectation behind every flash of irritation",
      "When I want to withdraw, say how long I need and come back on time",
      "Label the feeling in one precise word before I respond",
      "Ask \"why?\" three times about one thing that annoyed me",
    ],
  },
  {
    from: 22, to: 31, name: "Reading people", stage: "External",
    assignment: "Learn one person's normal behaviour (their baseline), then log one moment it changed.",
    focuses: [
      "Notice one person's normal style, then notice when it changes",
      "Listen 80%, speak 20% in one important conversation",
      "Watch for how things are said: pauses, pitch, over-explaining",
      "For one behaviour I read as negative, find two innocent explanations",
    ],
  },
  {
    from: 32, to: 41, name: "Integration", stage: "External",
    assignment: "Before a conversation you expect to be tense, plan your calm response and predict how the other person will react. Check afterwards.",
    focuses: [
      "Predict one person's reaction before I speak, then check",
      "Subtly match the pace and tone of the person I'm talking to",
      "Stay calm and keep observing during one tense conversation",
      "Use my weekly if-then plan the moment my top trigger shows up",
    ],
  },
];

// After the first 41 days (months 2–6) every cycle is synthesis: connecting the patterns you've logged.
const SYNTHESIS = {
  name: "Synthesis & pattern mastery", stage: "Synthesis",
  assignment: "Before one important interaction, use your notes on that person: predict their reaction and your own likely trigger, then compare afterwards.",
  focuses: [
    "Predict one person's reaction before I speak, then check",
    "Spot my top trigger early and run my if-then plan",
    "In a group, notice who defers to whom and who goes quiet",
    "Stay calm and observe during one tense conversation",
    "Let one delay go without chasing it",
    "Listen 80%, speak 20% in one important conversation",
  ],
};

// The neuroscience journey, stated honestly.
const JOURNEY = [
  { from: 1, to: 21, name: "Cognitive friction", text: "Your thinking brain has to work hard to override automatic reactions. Expect it to feel effortful and tiring. That effort is the training." },
  { from: 22, to: 41, name: "Pathway formation", text: "With daily repetition, pausing and observing start to feel more natural. Missed days slow this down only a little." },
  { from: 42, to: 183, name: "Automaticity", text: "The new responses become your default, even under pressure. Keep the daily loop light and focus on patterns." },
];
const JOURNEY_NOTE = "Honest note: there is no magic number of days. In the best-known study, simple habits took a median of 66 days to become automatic, ranging from 18 to 254 days. The 41-day cycle is a practical training block, and 6 months is a realistic horizon for deeper change.";
const PROGRAMME_DAYS = 183; // about six months

// Body-language cue checklist. Each cue is a possible signal, never proof.
const CUE_GROUPS = [
  {
    area: "Feet & legs", cues: [
      { id: "feetAway", short: "Feet turn away", meaning: "Feet turn toward the door or away from you: may want to leave or end the conversation." },
      { id: "legsStill", short: "Legs freeze", meaning: "Bouncing legs suddenly stop: something just caught their attention or worried them." },
      { id: "legsHappy", short: "Bouncy feet", meaning: "Feet bounce or wiggle after good news: often a sign of genuine excitement." },
    ],
  },
  {
    area: "Torso", cues: [
      { id: "leanAway", short: "Leans away", meaning: "Leaning back or turning the chest away: discomfort, disagreement or distance." },
      { id: "leanIn", short: "Leans in", meaning: "Leaning in, chest facing you: interest, comfort or engagement." },
      { id: "blocking", short: "Blocks body", meaning: "Puts a bag, laptop or crossed arms in front suddenly: wants a barrier. Could also just be cold or comfortable." },
    ],
  },
  {
    area: "Arms & hands", cues: [
      { id: "selfTouch", short: "Touches neck/face", meaning: "Rubbing the neck, face or forearm: self-soothing under stress." },
      { id: "steeple", short: "Steeples fingers", meaning: "Fingertips touching in a steeple: confidence and certainty." },
      { id: "handsHidden", short: "Hides hands", meaning: "Hands go into pockets or under the table mid-conversation: lower confidence or holding back." },
      { id: "gripping", short: "Grips tightly", meaning: "Gripping a chair arm, cup or their own hands: tension being held in." },
    ],
  },
  {
    area: "Face", cues: [
      { id: "lipsPress", short: "Lips pressed", meaning: "Lips pressed together or disappearing: holding something back, disagreement or stress." },
      { id: "eyeBlock", short: "Blocks eyes", meaning: "Closing eyes longer, rubbing them, looking away: not wanting to see or hear something." },
      { id: "blinkUp", short: "Blinks faster", meaning: "Blink rate goes up: stress or heavy thinking." },
      { id: "browKnit", short: "Brow knits", meaning: "Brows pull together briefly: confusion, concern or disagreement." },
      { id: "realSmile", short: "Real smile", meaning: "Smile reaches the eyes (crow's feet): genuine warmth, not politeness." },
    ],
  },
  {
    area: "Voice", cues: [
      { id: "pitchUp", short: "Pitch rises", meaning: "Voice gets higher or tighter: rising stress or emotion." },
      { id: "speedUp", short: "Speeds up", meaning: "Talks faster than usual: anxiety, excitement or wanting to get past the topic." },
      { id: "quieter", short: "Goes quiet", meaning: "Volume drops or answers get shorter: discomfort, hurt or withdrawal." },
    ],
  },
  {
    area: "Words", cues: [
      { id: "hesitate", short: "Hesitates", meaning: "Pauses before answering a simple question: thinking it through or uncomfortable with the topic." },
      { id: "overExplain", short: "Over-explains", meaning: "Gives far more detail than asked: anxious to be believed or understood." },
      { id: "distance", short: "Distancing words", meaning: "Shifts from \"I\" to \"we\" or \"you\", or becomes formal: creating distance from something." },
      { id: "defensive", short: "Defensive phrasing", meaning: "\"To be honest…\", \"I would never…\": defending before being accused." },
    ],
  },
  {
    area: "Rapport", cues: [
      { id: "mirrors", short: "Mirrors you", meaning: "Their posture or pace matches yours: rapport and comfort." },
      { id: "unmirror", short: "Stops mirroring", meaning: "They stop matching you after something you said: a shift in comfort." },
    ],
  },
];
const CUES = Object.fromEntries(CUE_GROUPS.flatMap(g => g.cues.map(c => [c.id, c])));
const CUE_CAUTION = "No single cue means one thing. Look for (1) a change from the person's normal behaviour, (2) a cluster of two or three cues together, and (3) the context. Even trained people spot lies only slightly better than chance, so treat every read as a guess to check, not a verdict.";

// What the app shows when the trigger button is pressed.
const TRIGGER_TYPES = {
  urgency: {
    label: "Impatience / urgency",
    emoji: "⏱",
    steps: [
      "Exhale slowly, longer than you inhale. Twice.",
      "Ask: will this delay matter in 7 days? If not, it's \"scheduled\", not \"urgent\".",
      "Name one reason the other person might be slower (workload, unclear request, different priority).",
      "If it really is urgent, ask one calm, specific question: \"What would help this get done by ___?\"",
    ],
    src: ["bruehlman2015", "ross1977", "friedman1974"],
  },
  voice: {
    label: "Voice rising / snapping",
    emoji: "🔊",
    steps: [
      "Stop talking. Slow exhale for a count of 3 before your next word.",
      "Drop your shoulders and lower your pitch. Speak at half your current speed.",
      "Silently label it: \"I am feeling ___.\"",
      "If you can't lower your voice, take a time-out: \"Give me 10 minutes, then let's continue.\"",
    ],
    src: ["lieberman2007", "zaccaro2018", "samhsa2019"],
  },
  sulking: {
    label: "Hurt / sulking / withdrawing",
    emoji: "🌧",
    steps: [
      "Name the unmet expectation: \"I expected ___ and got ___.\"",
      "Say it out loud, neutrally: \"I need 15 minutes to think, then let's talk.\" Start the timebox below.",
      "Third-person check: \"What would I tell a friend who felt this way?\"",
      "When the time is up, re-engage with one sentence: what you saw, what you felt, what you need.",
    ],
    src: ["linehan2015", "kross2014", "rosenberg2003"],
    timeboxMin: 15,
  },
  other: {
    label: "Other strong reaction",
    emoji: "⚡",
    steps: [
      "Slow exhale, longer than the inhale. Twice.",
      "Label the feeling in one word.",
      "Separate the fact (what happened) from the story (what you think it means).",
      "Choose: respond now calmly, or schedule it for later.",
    ],
    src: ["lieberman2007", "kahneman2011"],
  },
};

// Precise feeling words: the more exact the label, the more it helps.
const EMOTIONS = ["Angry", "Frustrated", "Impatient", "Rushed", "Hurt", "Disrespected", "Ignored", "Resentful", "Anxious", "Overwhelmed", "Defensive", "Embarrassed", "Disappointed", "Jealous"];

// One-tap "handled it well" captures. Logging wins reinforces the new behaviour.
const WINS = {
  pause: { label: "Held a 3-second pause", emoji: "⏸" },
  voice: { label: "Kept my voice low and slow", emoji: "🔉" },
  wait: { label: "Let someone work at their pace", emoji: "🐢" },
  reengage: { label: "Re-engaged instead of sulking", emoji: "🤝" },
  listen: { label: "Listened more than I spoke", emoji: "👂" },
  reframe: { label: "Found an innocent explanation", emoji: "🔍" },
};

// Core drivers for the "Why × 3" drill.
const DRIVERS = ["Fear", "Ego / pride", "Control / security", "Need to be valued", "Fairness", "Tiredness / stress"];

// Evening self-assessment (1 = poor, 5 = excellent).
const EQ_SCORES = [
  { key: "urgency", label: "Patience", q: "Did I let others work at their pace, or force my timeline?" },
  { key: "voice", label: "Voice", q: "Did I keep my voice calm and avoid snapping?" },
  { key: "recovery", label: "Recovery", q: "When upset, did I come back to calm quickly instead of sulking?" },
  { key: "observe", label: "Observing", q: "Did I notice how others really were, beyond their words?" },
  { key: "presence", label: "Presence", q: "Was my posture open and my pace calm?" },
];

// The theory vault. Ideas are summarised in our own words.
const PILLARS = [
  {
    name: "Observation & body language", emoji: "👁",
    books: [
      { title: "What Every BODY Is Saying", author: "Joe Navarro", ideas: [
        "Learn a person's normal first; only a change from that baseline is informative.",
        "Most cues signal comfort or discomfort, not truth or lies.",
        "The feet and legs are less consciously controlled than the face, so they often leak more.",
      ], inApp: "Cue checklist, Observe log and per-person baselines." },
    ],
  },
  {
    name: "Analytical thinking", emoji: "🧠",
    books: [
      { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", ideas: [
        "System 1 is fast, automatic and confident; System 2 is slow and checks the evidence.",
        "We build confident stories from whatever little we see, ignoring what we don't see.",
        "Slowing down to ask \"what is the evidence?\" catches most snap misjudgements.",
      ], inApp: "Night log: first read versus evidence, two alternatives, Why × 3." },
      { title: "Superforecasting", author: "Philip Tetlock & Dan Gardner", ideas: [
        "Write predictions down so you can't rewrite them afterwards.",
        "Check them and keep score; calibration improves only with feedback.",
      ], inApp: "Predictions in the Observe log and your read-accuracy score." },
    ],
  },
  {
    name: "Emotional balance", emoji: "🌿",
    books: [
      { title: "Emotional Intelligence", author: "Daniel Goleman", ideas: [
        "Self-awareness comes first: you can't manage a feeling you haven't noticed.",
        "Self-regulation is a skill built by practice, not a personality trait.",
        "Empathy grows from attention to others' signals, which calm makes possible.",
      ], inApp: "Feeling labels, daily ratings and the Trigger flow." },
      { title: "The Body Keeps the Score", author: "Bessel van der Kolk", ideas: [
        "Emotions live in the body; calming the body is a direct route to calming the mind.",
        "Noticing body sensations early (jaw, chest, heat) gives you time to choose.",
      ], inApp: "Breathing drill, posture set and the 'first body sign' focus." },
      { title: "Physiological sigh research", author: "Balban et al. (Huberman lab), 2023", ideas: [
        "Two inhales then a long exhale lowers arousal quickly.",
        "Five minutes a day improved mood more than mindfulness in the trial.",
      ], inApp: "The morning breathing timer (3 sighs, 1 or 5 minutes)." },
    ],
  },
  {
    name: "Urgency, anger & sulking", emoji: "🔥",
    books: [
      { title: "Type A Behavior and Your Heart", author: "Meyer Friedman & Ray Rosenman", ideas: [
        "Chronic hurry and irritation at others' pace go together and wear down the body.",
        "Deliberately practising waiting reduces both.",
      ], inApp: "Patience phase, 7-day test, 'Let someone work at their pace' wins." },
      { title: "The Chimp Paradox", author: "Steve Peters", ideas: [
        "Your fast emotional 'chimp' reacts before your reasoning self can.",
        "Let the first wave pass (breathe, time-out), then decide with your reasoning self.",
      ], inApp: "The Trigger flow and its timer." },
      { title: "Nonviolent Communication", author: "Marshall Rosenberg", ideas: [
        "Separate what you observed from your judgement of it.",
        "Say: what I saw, what I feel, what I need, and one clear request.",
      ], inApp: "Re-engaging after a sulk, and the fact-versus-story night log." },
      { title: "Atlas of the Heart", author: "Brené Brown", ideas: [
        "Precise emotion words give you more control than vague ones like 'upset'.",
      ], inApp: "The feeling-word chips in the Trigger flow." },
      { title: "Emotional Agility", author: "Susan David", ideas: [
        "Notice and name the feeling, step back from it, then act on your values.",
        "Stepping away for a stated, limited time is healthy; disappearing isn't.",
      ], inApp: "The 15-minute timebox for sulking." },
    ],
  },
  {
    name: "Habits & consistency", emoji: "🔁",
    books: [
      { title: "Atomic Habits", author: "James Clear", ideas: [
        "Make it easy: tiny daily actions beat occasional big efforts.",
        "Never miss twice: one miss is an accident, two is a new habit.",
        "Track it visibly; seeing progress keeps you going.",
      ], inApp: "The 6-minute daily loop, streak and 41-day grid." },
    ],
  },
];

// The four layers of the system, for the Library overview.
const LAYERS = [
  { name: "1 · Observation", text: "Learn people's baseline, then notice changes in posture, eye contact, voice and wording. Listen 80%, speak 20%." },
  { name: "2 · Analysis", text: "Separate fact from interpretation. Generate two alternative explanations. Ask \"why?\" three times to find the core driver." },
  { name: "3 · Emotional regulation", text: "Create a 2–3 second gap before reacting. Breathe out slowly. Name the feeling to reduce its intensity." },
  { name: "4 · Presence", text: "Open, grounded posture, calm pace, hands visible. Subtly match the other person's pace to build rapport." },
];

const CRISIS_TEXT = "This app supports skill-building. It is not therapy or medical treatment. If you have thoughts of harming yourself or someone else, contact a professional or call Tele-MANAS on 14416 (India, free, 24/7) or your local emergency number.";

// ---------- Sadhana: japa mala, pranayama, meditation ----------
// Techniques follow the Common Yoga Protocol and Light on Pranayama. Ratios are in seconds.
const PRANAYAMA = {
  nadi: {
    name: "Nadi Shodhana", alt: "Anuloma Viloma · alternate-nostril breathing",
    why: "Balances and steadies. Induces calm, improves concentration and lowers stress and anxiety. Good before demanding work.",
    steps: [
      "Sit tall in any comfortable meditative posture, eyes closed. Relax with a few deep breaths.",
      "Left hand on the left knee in Jnana mudra. Right hand in Nasagra mudra: index and middle fingers folded, thumb by the right nostril, ring and little fingers by the left.",
      "Close the right nostril with the thumb and breathe in through the left.",
      "Close the left with the ring and little fingers, release the thumb, breathe out through the right.",
      "Breathe in through the right, close it, open the left and breathe out through the left. That is one round.",
      "Keep the breath slow, steady and controlled, never forced. Start with equal inhale and exhale, then gradually move to 1 : 2.",
    ],
    ratios: [
      { id: "eq4", label: "Equal 4 : 4 (beginner)", i: 4, h: 0, e: 4 },
      { id: "r12", label: "1 : 2 · 4 : 8", i: 4, h: 0, e: 8 },
      { id: "r5", label: "1 : 2 · 5 : 10", i: 5, h: 0, e: 10 },
      { id: "hold", label: "With hold 4 : 4 : 8", i: 4, h: 4, e: 8 },
    ],
    rounds: [3, 5, 9, 11], defRounds: 5, src: ["cyp", "telles2014"],
  },
  bhramari: {
    name: "Bhramari", alt: "Humming-bee breath",
    why: "Your go-to for anger, a raised voice or restless urgency. The steady hum soothes the nervous system and relaxes the throat and voice.",
    steps: [
      "Sit in any meditative posture with eyes closed.",
      "Breathe in deeply through the nose.",
      "Breathe out slowly and steadily while making a deep, even humming sound, like a black bee. That is one round.",
      "Optional (Shanmukhi mudra): thumbs close the ears, index fingers rest on the closed eyes, ring and little fingers by the lips.",
      "Avoid with a nose or ear infection.",
    ],
    ratios: [
      { id: "h6", label: "Hum 6 s", i: 4, h: 0, e: 6 },
      { id: "h8", label: "Hum 8 s", i: 4, h: 0, e: 8 },
      { id: "h10", label: "Hum 10 s", i: 4, h: 0, e: 10 },
      { id: "h12", label: "Hum 12 s", i: 5, h: 0, e: 12 },
    ],
    rounds: [3, 5, 9, 11], defRounds: 5, hum: true, src: ["cyp", "pramanik2010"],
  },
  box: {
    name: "Sama Vritti", alt: "Equal / box breathing",
    why: "Inhale, hold, exhale, hold, all the same length. Immediate steadiness before a difficult conversation.",
    steps: [
      "Sit or stand tall. Breathe through the nose.",
      "Inhale for the count, hold gently, exhale for the same count, hold empty for the same count.",
      "Holds should feel easy and soft, never a strain. If they don't, use Gentle mode.",
      "Master equal breathing (sama vrtti) before trying unequal ratios.",
    ],
    ratios: [
      { id: "b3", label: "3 · 3 · 3 · 3", i: 3, h: 3, e: 3, h2: 3 },
      { id: "b4", label: "4 · 4 · 4 · 4", i: 4, h: 4, e: 4, h2: 4 },
      { id: "b5", label: "5 · 5 · 5 · 5", i: 5, h: 5, e: 5, h2: 5 },
      { id: "b6", label: "6 · 6 · 6 · 6", i: 6, h: 6, e: 6, h2: 6 },
    ],
    rounds: [4, 6, 10, 15], defRounds: 6, src: ["iyengarLoP", "balban2023"],
  },
  deep: {
    name: "Dirgha Shvasa", alt: "Slow deep breathing, no holds",
    why: "Safe for everyone, including high blood pressure and heart conditions. Slow nasal breathing near six breaths a minute calms the body.",
    steps: [
      "Sit comfortably. Breathe through the nose into the belly, then the ribs, then the upper chest.",
      "Exhale slowly and completely in reverse.",
      "No holds. Keep it soft and quiet.",
    ],
    ratios: [
      { id: "d55", label: "5 : 5 (6 per min)", i: 5, h: 0, e: 5 },
      { id: "d46", label: "4 : 6 (6 per min)", i: 4, h: 0, e: 6 },
      { id: "d44", label: "4 : 4 (easy)", i: 4, h: 0, e: 4 },
    ],
    rounds: [6, 12, 30, 60], defRounds: 12, src: ["mandlik", "zaccaro2018"],
  },
};

const MEDITATION_STYLES = {
  breath: { name: "Breath awareness", text: "Sit with the spine comfortably erect, eyes closed, face slightly upturned. You need not concentrate: keep a mild focus between the eyebrows and stay conscious of the breath. When thoughts come, let them pass and return to the breath.", src: "cyp" },
  mantra: { name: "Silent mantra", text: "Repeat your mantra silently, without moving the lips or tongue, letting it ride on the breath. Reflect on its meaning (artha-bhavana) rather than counting.", src: "iyengarLoP" },
  open: { name: "Just sit", text: "A quiet spot, a comfortable posture. Let thoughts and sensations come and go without judging them. Whenever you notice you've drifted, gently come back. That return is the practice.", src: "mayo" },
};

const SANKALPAS = [
  "I will keep my mind balanced today.",
  "I will speak slowly and softly, even when rushed.",
  "I will let others work at their pace.",
  "I will come back to calm quickly and re-engage.",
  "Through every action I will create a peaceful atmosphere around me.",
];

// How to use a physical mala alongside (or instead of) the counter.
const MALA_HOW = [
  "Hold the mala in one hand, draped over the middle finger. Many teachers use the non-dominant hand; in Hindu practice it is usually the right hand, with the index finger kept off the beads. Follow your own tradition or teacher.",
  "Start at the bead next to the guru (meru) bead, the larger bead with the tassel.",
  "Use your thumb to pull one bead towards you for each mantra, one bead at a time, letting the breath and mantra set the rhythm.",
  "When you reach the guru bead, don't cross it. Pause, turn the mala around and go back the other way for the next round.",
];

const JAPA_NOTES = [
  "Japa (repetition of a mantra) gathers a wandering, agitated mind onto a single thought, act or feeling.",
  "Repeat with reflection on the meaning (artha-bhavana), with sincerity and feeling. Mechanical counting is not the aim; the counter just frees you from keeping track.",
  "Silent japa can flow with the breath, without moving the mouth or tongue. This keeps the mind attentive and lengthens the breath.",
  "A traditional mala has 108 beads plus the guru (meru) bead. Bring an intention (sankalpa) to each round; the beads become a reminder you can carry wherever you go.",
];

const SADHANA_CAUTION = "Breathe through the nose, slowly, never forced or strained. Stop and breathe normally if you feel dizzy, breathless or uneasy. If you have high blood pressure or a heart condition, or are pregnant, skip breath holds: turn on Gentle mode. Avoid Bhramari with a nose or ear infection. Practise on an empty stomach, ideally at a fixed time each morning. This is not medical treatment; check with your doctor if you have a health condition.";

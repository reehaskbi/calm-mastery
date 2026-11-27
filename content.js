// All programme content lives here, separate from the app logic.
// Techniques are written in our own words and linked to the research they come from,
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
];

// Phases of the 41-day cycle. One focus is chosen each morning.
const PHASES = [
  {
    from: 1, to: 14, name: "Foundation: breath & voice",
    focuses: [
      "Keep my voice slightly lower and slower than the other person's",
      "One slow exhale before every reply when I feel irritated",
      "Notice the first body sign of anger (jaw, chest, heat)",
      "Shoulders down, feet flat when a conversation gets tense",
    ],
  },
  {
    from: 15, to: 28, name: "Patience & urgency",
    focuses: [
      "Let one non-critical task move at someone else's pace without stepping in",
      "Before chasing a delay, ask: will this matter in 7 days?",
      "Hand over a task and don't correct it until it's finished",
      "Say \"when could this be done?\" instead of \"why isn't this done?\"",
    ],
  },
  {
    from: 29, to: 41, name: "Reading others & reframing",
    focuses: [
      "Notice one person's normal style, then notice when it changes",
      "For one annoying behaviour, find two innocent explanations",
      "Listen more than I speak in one important conversation",
      "When I want to withdraw, say how long I need and come back on time",
    ],
  },
];

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
    src: ["bruehlman2015", "ross1977", "gross2003"],
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
      "When the time is up, re-engage with one sentence, even a small one.",
    ],
    src: ["linehan2015", "kross2014", "samhsa2019"],
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

const EMOTIONS = ["Angry", "Frustrated", "Impatient", "Hurt", "Disrespected", "Anxious", "Defensive", "Embarrassed", "Disappointed"];

// Evening self-assessment (1 = poor, 5 = excellent).
const EQ_SCORES = [
  { key: "urgency", label: "Patience", q: "Did I let others work at their pace, or force my timeline?" },
  { key: "voice", label: "Voice control", q: "Did I keep my voice calm and avoid snapping?" },
  { key: "recovery", label: "Recovery", q: "When upset, did I come back to calm quickly instead of sulking?" },
];

const CRISIS_TEXT = "This app supports skill-building. It is not therapy or medical treatment. If you have thoughts of harming yourself or someone else, contact a professional or call Tele-MANAS on 14416 (India, free, 24/7) or your local emergency number.";

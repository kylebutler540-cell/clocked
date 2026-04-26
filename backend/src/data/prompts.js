/**
 * Daily Prompts Pool
 * Each prompt has a universal question + industry-specific variants.
 * Today's prompt = prompts[dayIndex % prompts.length]
 * dayIndex = Math.floor(Date.now() / 86400000) — days since epoch (UTC)
 */

const PROMPTS = [
  {
    id: 0,
    category: 'management',
    responseType: 'yesno',
    hook: 'Be honest —',
    variants: {
      general:   'Did management support you today?',
      restaurant:'Did your manager have your back during service?',
      retail:    'Was your manager actually present and helpful today?',
      hvac:      'Did your supervisor check in on your jobs today?',
      office:    'Did your manager help you get things done today?',
      warehouse: 'Was management visible on the floor today?',
      healthcare:'Did your charge nurse or supervisor support the team today?',
    },
  },
  {
    id: 1,
    category: 'workload',
    responseType: 'slider',
    hook: 'Real talk —',
    variants: {
      general:   'How was the workload today?',
      restaurant:'How insane was your shift today?',
      retail:    'How slammed was the floor today?',
      hvac:      'How heavy was the job load today?',
      office:    'How overwhelming was today\'s workload?',
      warehouse: 'How brutal was the pace today?',
      healthcare:'How manageable was your patient load today?',
    },
  },
  {
    id: 2,
    category: 'customers',
    responseType: 'slider',
    hook: 'Unfiltered —',
    variants: {
      general:   'How were the people you dealt with today?',
      restaurant:'How were your tables treating the staff today?',
      retail:    'How were customers treating everyone today?',
      hvac:      'How was the homeowner or client today?',
      office:    'How were the clients or stakeholders today?',
      warehouse: 'How reasonable were the customer demands today?',
      healthcare:'How cooperative were patients and families today?',
    },
  },
  {
    id: 3,
    category: 'pay',
    responseType: 'yesno',
    hook: 'No corporate answer:',
    variants: {
      general:   'Did today feel worth what you\'re getting paid?',
      restaurant:'Did your tips match the work you put in today?',
      retail:    'Did today\'s grind feel worth your hourly rate?',
      hvac:      'Did the job pay match the actual work today?',
      office:    'Did today\'s output feel worth your salary?',
      warehouse: 'Did today\'s physical grind match your paycheck?',
      healthcare:'Did today feel compensated fairly for what you handled?',
    },
  },
  {
    id: 4,
    category: 'stress',
    responseType: 'slider',
    hook: 'Check in:',
    variants: {
      general:   'How stressed are you after today?',
      restaurant:'On a scale — how fried are you after that shift?',
      retail:    'How drained are you walking out the door today?',
      hvac:      'How beat are you after today\'s jobs?',
      office:    'How mentally exhausted are you right now?',
      warehouse: 'How physically wrecked do you feel after today?',
      healthcare:'How emotionally drained are you after today\'s shift?',
    },
  },
  {
    id: 5,
    category: 'culture',
    responseType: 'yesno',
    hook: 'Be real:',
    variants: {
      general:   'Do you feel safe speaking up at your job?',
      restaurant:'Can you actually talk to management without retaliation?',
      retail:    'Can you report problems at your store without fear?',
      hvac:      'Can you raise safety concerns without getting pushback?',
      office:    'Can you disagree with your boss without consequences?',
      warehouse: 'Can you flag issues on the floor without retaliation?',
      healthcare:'Can you advocate for your patients without pushback?',
    },
  },
  {
    id: 6,
    category: 'workload',
    responseType: 'yesno',
    hook: 'Quick one:',
    variants: {
      general:   'Did you get a real break today?',
      restaurant:'Did you actually get to eat during your shift?',
      retail:    'Did you get your scheduled breaks today?',
      hvac:      'Did the job actually allow for breaks today?',
      office:    'Did you step away from your screen at all today?',
      warehouse: 'Did you get your breaks on time today?',
      healthcare:'Did you get a real moment to breathe between patients today?',
    },
  },
  {
    id: 7,
    category: 'management',
    responseType: 'slider',
    hook: 'No sugarcoating —',
    variants: {
      general:   'Rate your management today.',
      restaurant:'How was your shift manager today?',
      retail:    'How did your store manager do today?',
      hvac:      'How did your supervisor handle today?',
      office:    'Rate your manager\'s performance today.',
      warehouse: 'How was your supervisor running things today?',
      healthcare:'Rate your charge or lead today.',
    },
  },
  {
    id: 8,
    category: 'culture',
    responseType: 'yesno',
    hook: 'Straight up:',
    variants: {
      general:   'Would you recommend your workplace to a friend?',
      restaurant:'Would you tell a friend to apply at your spot?',
      retail:    'Would you send a friend to work at your store?',
      hvac:      'Would you tell someone to join your company?',
      office:    'Would you recommend your company to someone you care about?',
      warehouse: 'Would you tell a friend to take a job here?',
      healthcare:'Would you recommend your facility to a fellow healthcare worker?',
    },
  },
  {
    id: 9,
    category: 'workload',
    responseType: 'poll',
    hook: 'No filter —',
    variants: {
      general:   'What slowed you down the most today?',
      restaurant:'What killed your shift today?',
      retail:    'What made today harder than it needed to be?',
      hvac:      'What got in the way today?',
      office:    'What killed your productivity today?',
      warehouse: 'What slowed the floor down today?',
      healthcare:'What made today harder than it should have been?',
    },
    pollOptions: {
      general:   ['Understaffed', 'Management', 'Bad systems', 'Customer issues'],
      restaurant:['Understaffed', 'Kitchen problems', 'Difficult tables', 'Management'],
      retail:    ['Understaffed', 'Inventory issues', 'Difficult customers', 'Management'],
      hvac:      ['Parts shortage', 'Understaffed', 'Customer delays', 'Scheduling'],
      office:    ['Too many meetings', 'Unclear priorities', 'Tech issues', 'Management'],
      warehouse: ['Understaffed', 'Equipment issues', 'Poor organization', 'Management'],
      healthcare:['Understaffed', 'Supply issues', 'Admin burden', 'Communication'],
    },
  },
  {
    id: 10,
    category: 'teamwork',
    responseType: 'yesno',
    hook: 'Check in:',
    variants: {
      general:   'Did a coworker have your back today?',
      restaurant:'Did the crew look out for each other today?',
      retail:    'Did your coworkers pull their weight today?',
      hvac:      'Did the crew work well together today?',
      office:    'Did a teammate actually help you out today?',
      warehouse: 'Was the crew looking out for each other today?',
      healthcare:'Did your team have each other\'s backs today?',
    },
  },
  {
    id: 11,
    category: 'management',
    responseType: 'yesno',
    hook: 'No HR here:',
    variants: {
      general:   'Does your manager actually know what it\'s like doing your job?',
      restaurant:'Has your manager ever actually worked a real rush?',
      retail:    'Does your manager understand what floor work is like?',
      hvac:      'Has your supervisor actually done the hands-on work?',
      office:    'Does your manager understand your actual day-to-day?',
      warehouse: 'Does your supervisor know what it\'s really like down here?',
      healthcare:'Does management understand what it\'s like on the floor?',
    },
  },
  {
    id: 12,
    category: 'culture',
    responseType: 'poll',
    hook: 'Quick check:',
    variants: {
      general:   'What\'s the biggest issue at your workplace right now?',
      restaurant:'What\'s the real problem at your restaurant right now?',
      retail:    'What\'s the biggest problem at your store right now?',
      hvac:      'What\'s the biggest issue at your company right now?',
      office:    'What\'s dragging your workplace down the most?',
      warehouse: 'What\'s the main problem on the floor right now?',
      healthcare:'What\'s the biggest challenge at your facility?',
    },
    pollOptions: {
      general:   ['Management', 'Low pay', 'Understaffed', 'Toxic culture'],
      restaurant:['Understaffed', 'Toxic kitchen', 'Low tips', 'Management'],
      retail:    ['Understaffed', 'Low pay', 'Management', 'Shoplifters'],
      hvac:      ['Safety concerns', 'Low pay', 'Understaffed', 'Management'],
      office:    ['Micromanagement', 'Low pay', 'No work-life balance', 'Poor culture'],
      warehouse: ['Unsafe conditions', 'Understaffed', 'Low pay', 'Management'],
      healthcare:['Understaffed', 'Burnout', 'Admin workload', 'Low pay'],
    },
  },
  {
    id: 13,
    category: 'pay',
    responseType: 'yesno',
    hook: 'Straight talk:',
    variants: {
      general:   'Would you quit tomorrow if you got a better offer?',
      restaurant:'Would you leave for $3 more an hour?',
      retail:    'Would you bolt the second a better job came through?',
      hvac:      'Would you jump ship if a better company called?',
      office:    'Would you take a recruiter\'s call right now?',
      warehouse: 'Would you leave this week for better pay?',
      healthcare:'Would you switch facilities if the pay was better?',
    },
  },
  {
    id: 14,
    category: 'stress',
    responseType: 'yesno',
    hook: 'Be honest:',
    variants: {
      general:   'Did work affect your mood outside of work today?',
      restaurant:'Did your shift follow you home today?',
      retail:    'Did work mess with your mood after you clocked out?',
      hvac:      'Did today\'s jobs stress you out beyond the clock?',
      office:    'Did work get into your head after hours today?',
      warehouse: 'Did the shift affect you after you left today?',
      healthcare:'Did today\'s shift follow you home emotionally?',
    },
  },
  {
    id: 15,
    category: 'teamwork',
    responseType: 'slider',
    hook: 'Honest answer —',
    variants: {
      general:   'How was the team energy today?',
      restaurant:'How was the crew holding it together today?',
      retail:    'How was the team vibing on the floor?',
      hvac:      'How well did the crew work together today?',
      office:    'How was the team collaboration today?',
      warehouse: 'How was the crew holding up today?',
      healthcare:'How was the team energy on your floor today?',
    },
  },
  {
    id: 16,
    category: 'culture',
    responseType: 'yesno',
    hook: 'Real question:',
    variants: {
      general:   'Does your workplace actually care about employees?',
      restaurant:'Does this place actually give a damn about its staff?',
      retail:    'Does your store actually care about workers?',
      hvac:      'Does your company actually care about the crew?',
      office:    'Does your company actually care about employees as people?',
      warehouse: 'Does this warehouse actually care about its workers?',
      healthcare:'Does your facility actually put staff wellbeing first?',
    },
  },
  {
    id: 17,
    category: 'management',
    responseType: 'poll',
    hook: 'Tell us:',
    variants: {
      general:   'How does your management typically handle problems?',
      restaurant:'When something goes wrong, what does management do?',
      retail:    'When problems hit the floor, what does management do?',
      hvac:      'When a job goes sideways, how does your supervisor react?',
      office:    'When things go wrong, what does your manager do?',
      warehouse: 'When something breaks down, what does management do?',
      healthcare:'When things go wrong, how does your lead respond?',
    },
    pollOptions: {
      general:   ['Actually help', 'Blame employees', 'Disappear', 'Make it worse'],
      restaurant:['Jump in and help', 'Point fingers at staff', 'Go hide in the office', 'Make it worse'],
      retail:    ['Handle it properly', 'Blame the staff', 'Go missing', 'Make it worse'],
      hvac:      ['Sort it out fast', 'Blame the crew', 'Stay behind a desk', 'Make it worse'],
      office:    ['Solve it with you', 'Blame the team', 'Ignore it', 'Schedule a meeting about it'],
      warehouse: ['Get on the floor', 'Blame workers', 'Disappear upstairs', 'Create more chaos'],
      healthcare:['Lead by example', 'Blame nursing', 'Defer to admin', 'Escalate unnecessarily'],
    },
  },
  {
    id: 18,
    category: 'pay',
    responseType: 'slider',
    hook: 'Honest take:',
    variants: {
      general:   'How well does your pay match the work you do?',
      restaurant:'How fair is your pay for what this job demands?',
      retail:    'How well does your hourly match the reality of this job?',
      hvac:      'How well does your pay match the skill and effort this work takes?',
      office:    'How well compensated are you for what you actually do?',
      warehouse: 'How fair is your pay for the physical demands of this job?',
      healthcare:'How fairly are you compensated for the weight of this work?',
    },
  },
  {
    id: 19,
    category: 'culture',
    responseType: 'slider',
    hook: 'Gut check:',
    variants: {
      general:   'How much do you actually enjoy going to work?',
      restaurant:'How much do you actually like coming in for your shifts?',
      retail:    'How much do you actually look forward to your shifts?',
      hvac:      'How much do you enjoy your work day-to-day?',
      office:    'On a real level, how much do you like your job?',
      warehouse: 'How much do you actually like coming into work?',
      healthcare:'How much do you still feel passion for this work?',
    },
  },
  {
    id: 20,
    category: 'customers',
    responseType: 'poll',
    hook: 'Be real:',
    variants: {
      general:   'How were people treating workers today?',
      restaurant:'How were your customers acting today?',
      retail:    'How were customers treating staff today?',
      hvac:      'How was the client today?',
      office:    'How were clients or stakeholders treating people today?',
      warehouse: 'How were the demands from the customer side today?',
      healthcare:'How were patients and families behaving today?',
    },
    pollOptions: {
      general:   ['Actually decent', 'Somewhat demanding', 'Really difficult', 'Total mix'],
      restaurant:['Good vibes all around', 'Demanding but manageable', 'Nightmare customers', 'Total mix'],
      retail:    ['Mostly respectful', 'Some entitlement', 'Genuinely rude ones', 'Total mix'],
      hvac:      ['Easy to work with', 'Slightly demanding', 'Nightmare client', 'Total mix'],
      office:    ['Reasonable and fair', 'Somewhat unreasonable', 'Out of control', 'Total mix'],
      warehouse: ['Realistic expectations', 'Somewhat unrealistic', 'Completely unreasonable', 'Total mix'],
      healthcare:['Cooperative', 'Stressed but okay', 'Really difficult', 'Total mix'],
    },
  },
  {
    id: 21,
    category: 'workload',
    responseType: 'yesno',
    hook: 'Straight up:',
    variants: {
      general:   'Did you leave work today feeling like you actually got things done?',
      restaurant:'Did you leave feeling like the shift was worth the effort?',
      retail:    'Did you feel productive by the end of your shift?',
      hvac:      'Did you finish today\'s jobs feeling satisfied with the work?',
      office:    'Did you actually accomplish something meaningful today?',
      warehouse: 'Did the shift feel productive and organized?',
      healthcare:'Did you feel like you genuinely helped people today?',
    },
  },
  {
    id: 22,
    category: 'stress',
    responseType: 'slider',
    hook: 'Honest check:',
    variants: {
      general:   'How close to burnout are you right now?',
      restaurant:'How close to just walking out are you right now?',
      retail:    'How close to the edge are you with this job right now?',
      hvac:      'How worn down are you by this job right now?',
      office:    'How close to burnout are you right now?',
      warehouse: 'How close to done are you with this job right now?',
      healthcare:'How close to burnout are you feeling right now?',
    },
  },
  {
    id: 23,
    category: 'management',
    responseType: 'yesno',
    hook: 'Real talk:',
    variants: {
      general:   'Would your workplace be better without your current manager?',
      restaurant:'Would your restaurant run better without your current manager?',
      retail:    'Would your store be better off without your current manager?',
      hvac:      'Would your crew perform better with different leadership?',
      office:    'Would your team do better without your current manager?',
      warehouse: 'Would the floor run better with different supervision?',
      healthcare:'Would your unit run better under different leadership?',
    },
  },
  {
    id: 24,
    category: 'customers',
    responseType: 'yesno',
    hook: 'Tell it:',
    variants: {
      general:   'Did a customer cross the line today?',
      restaurant:'Did a customer disrespect someone on staff today?',
      retail:    'Did a customer act inappropriately today?',
      hvac:      'Did a client make the job harder than it needed to be?',
      office:    'Did a client push you past a reasonable limit today?',
      warehouse: 'Did unrealistic customer demands cause problems today?',
      healthcare:'Did a patient or family member cross a line today?',
    },
  },
];

/**
 * Get today's prompt based on current date (UTC).
 * Returns the same prompt for all users on the same calendar day.
 */
function getTodayPrompt() {
  const now = new Date();
  const dayIndex = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  return PROMPTS[dayIndex % PROMPTS.length];
}

/**
 * Get the question text for a specific industry.
 */
function getPromptText(prompt, industry) {
  const ind = industry && prompt.variants[industry] ? industry : 'general';
  return prompt.variants[ind];
}

/**
 * Get poll options for a specific industry (polls only).
 */
function getPollOptions(prompt, industry) {
  if (prompt.responseType !== 'poll') return null;
  const ind = industry && prompt.pollOptions[industry] ? industry : 'general';
  return prompt.pollOptions[ind];
}

/**
 * Get today's date string YYYY-MM-DD (UTC).
 */
function getTodayDateStr() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { PROMPTS, getTodayPrompt, getPromptText, getPollOptions, getTodayDateStr };

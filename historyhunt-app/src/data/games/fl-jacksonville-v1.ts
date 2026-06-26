import { Question } from "@/types/question";

export const game = {
  slug: "fl-jacksonville-v1",
  title: "Florida Jacksonville Challenge v1",
  state: "FL",
  city: "Jacksonville",
  campaign: "freedom-fest-250-jacksonville-2026",
  venue: "jacksonville-waterfront",
  questionCount: 10,
  totalPoints: 11,
};

export const questions: Question[] =  [
  {
    lyric: "Ink on a page… thirteen voices standin' up to fight",
    question:
      "How many signers of the Declaration of Independence were held in British-controlled St. Augustine during the Revolutionary War?",
    choices: ["1", "2", "3", "13"],
    answer: "3",
    fact:
      "Thomas Heyward Jr., Arthur Middleton, and Edward Rutledge were captured after the British siege of Charleston in 1780 and sent to British East Florida, where they were held under house arrest in St. Augustine.",
    lyricMeaning:
      "This lyric points to the Declaration as more than words on paper. It reminds players that the men who signed it risked capture, imprisonment, and death.",
  },
  {
    lyric: "No Crown Above Us",
    question:
      "In what year did Florida finally come under the American flag, ending nearly three centuries of Spanish and British rule?",
    choices: ["1776", "1812", "1821", "1833"],
    answer: "1821",
    fact:
      "Florida flew Spanish and British flags for almost 300 years before the American flag was raised in 1821. Florida became the 27th state in 1845.",
    lyricMeaning:
      "This lyric celebrates the American break from monarchy. Florida’s long history under European crowns makes the phrase especially powerful.",
  },
  {
    lyric: "A force of change for humanity",
    question:
      "Which Florida educator and civil rights leader founded the school that became Bethune-Cookman University?",
    choices: [
      "Zora Neale Hurston",
      "Mary McLeod Bethune",
      "Harriet Tubman",
      "Rosa Parks",
    ],
    answer: "Mary McLeod Bethune",
    fact:
      "Mary McLeod Bethune founded a school for girls in Daytona Beach in 1904 with just $1.50. It grew into Bethune-Cookman University, and she later advised four U.S. presidents.",
    lyricMeaning:
      "This lyric honors Americans who changed the country through courage, education, leadership, and service—not only through war or politics.",
  },
  {
    lyric: "We answered allies when they made the call",
    question:
      "Approximately how many military personnel trained in Florida during World War II?",
    choices: ["33,000", "77,000", "172,000", "244,000"],
    answer: "172,000",
    fact:
      "Florida became one of America’s major military training grounds during World War II. More than 172,000 military personnel trained in the state.",
    lyricMeaning:
      "This lyric connects Florida to America’s role in defending allies during World War II. Florida was not just watching history happen—it helped prepare those who served.",
  },
  {
    lyric: "Call it freedom",
    question:
      "Near which Florida city was Fort Mose established in 1738—the first legally sanctioned free Black settlement in what became the United States?",
    choices: ["Pensacola", "Jacksonville", "St. Augustine", "Tallahassee"],
    answer: "St. Augustine",
    fact:
      "Fort Mose was established just north of St. Augustine in 1738. Escaped enslaved people who reached Spanish Florida could gain freedom and build a fortified community there.",
    lyricMeaning:
      "This lyric invites players to ask what freedom meant before America existed. Fort Mose shows that Florida’s freedom story began long before 1776.",
  },
  {
    lyric: "Laid down the rails, sweat and steel",
    question:
      "Which entrepreneur built the Florida East Coast Railway and transformed Florida’s east coast?",
    choices: ["Walt Disney", "Henry Flagler", "Andrew Carnegie", "Thomas Edison"],
    answer: "Henry Flagler",
    fact:
      "Henry Flagler extended the Florida East Coast Railway from St. Augustine to Miami and eventually across open water to Key West.",
    lyricMeaning:
      "This lyric honors the labor, risk, engineering, and ambition that connected distant places and helped build modern America.",
  },
  {
    lyric: "From Kitty Hawk to the Lunar Face",
    question:
      "Which Florida military installation supported every Apollo Moon mission launch?",
    choices: [
      "MacDill Air Force Base",
      "Eglin Air Force Base",
      "Patrick Air Force Base",
      "Homestead Air Force Base",
    ],
    answer: "Patrick Air Force Base",
    fact:
      "Patrick Air Force Base—now Patrick Space Force Base—provided critical range, tracking, rescue, and mission support for Apollo launches from nearby Kennedy Space Center.",
    lyricMeaning:
      "This lyric connects the first powered flight at Kitty Hawk to humanity’s first steps on the Moon, with Florida serving as the launch point for that leap.",
  },
  {
    lyric: "We reach out in our time of need",
    question:
      "Approximately how many Cubans arrived in the United States through Miami during the Freedom Flights between 1965 and 1973?",
    choices: ["25,000", "75,000", "260,000+", "1 million"],
    answer: "260,000+",
    fact:
      "More than 260,000 Cubans arrived through Miami during the Freedom Flights, making it one of the largest refugee airlifts in American history.",
    lyricMeaning:
      "This lyric reflects America’s role as a place of refuge and second chances. In Florida, that story came through Miami and reshaped the state forever.",
  },
  {
    lyric: "When the world shakes, when waters rise",
    question:
      "The devastating 1935 Florida Keys hurricane—the strongest hurricane to ever strike the United States—made landfall on which American holiday?",
    choices: ["Independence Day", "Memorial Day", "Labor Day", "Flag Day"],
    answer: "Labor Day",
    fact:
      "The Labor Day Hurricane of 1935 packed 185 mph winds and remains the strongest hurricane ever to make landfall in the United States. It claimed 423 lives, including many World War I veterans working in the Florida Keys.",
    lyricMeaning:
      "This lyric speaks to crisis, disaster, and recovery. Florida’s hurricane history shows how communities are tested when waters rise—and how they rebuild.",
  },
  {
    lyric: "",
    bonus: true,
    points: 2,
    question:
      "🎵 BONUS QUESTION (Worth 2 Points): Listen to America 250 Proof™ through approximately 1:30. Which historic event is directly referenced in the lyric?",
    choices: [
      "The Pilgrims landing at Plymouth Rock",
      "The signing of the Declaration of Independence",
      "Neil Armstrong’s first Moon landing",
      "The completion of the Transcontinental Railroad",
    ],
    answer: "Neil Armstrong’s first Moon landing",
    fact:
      "The lyric references Neil Armstrong’s first steps on the Moon in 1969. Every Apollo mission began its journey from Florida’s Space Coast.",
    lyricMeaning:
      "This bonus question rewards players for listening closely. The song connects national memory to Florida’s Space Coast, where America launched its journey to the Moon.",
    youtubePrompt:
      "Need a hint? Tap Listen to the Song and listen through about the 1:30 mark.",
  },
];

export default {
  game,
  questions,
};
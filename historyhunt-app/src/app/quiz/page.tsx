"use client";

import { useState } from "react";

const questions = [
  {
    question:
      "Where was the first legally sanctioned free Black settlement in what became the United States?",
    choices: ["Charleston", "Savannah", "Fort Mose", "Pensacola"],
    answer: "Fort Mose",
    fact:
      "Fort Mose was established near St. Augustine in 1738 and is one of Florida’s most important freedom stories.",
  },
  {
    question:
      "How many Declaration of Independence signers were held in St. Augustine during the Revolutionary War?",
    choices: ["1", "2", "3", "13"],
    answer: "3",
    fact:
      "Thomas Heyward Jr., Arthur Middleton, and Edward Rutledge were sent to British-controlled St. Augustine after the siege of Charleston.",
  },
  {
    question:
      "What is the oldest continuously occupied European-founded city in the United States?",
    choices: ["Jamestown", "Plymouth", "St. Augustine", "Williamsburg"],
    answer: "St. Augustine",
    fact:
      "St. Augustine was founded in 1565, more than 200 years before the Declaration of Independence.",
  },
  {
    question:
      "Which entrepreneur helped build railroads, luxury hotels, and modern tourism along Florida’s east coast?",
    choices: ["Walt Disney", "Henry Flagler", "Andrew Carnegie", "Thomas Edison"],
    answer: "Henry Flagler",
    fact:
      "Henry Flagler’s railroads and hotels helped transform Florida into a national destination.",
  },
  {
    question:
      "Which Florida city was devastated by one of the largest urban fires in American history in 1901?",
    choices: ["Tampa", "Miami", "Jacksonville", "Orlando"],
    answer: "Jacksonville",
    fact:
      "The Great Jacksonville Fire of 1901 destroyed more than 2,300 buildings and forced the city to rebuild.",
  },
  {
    question:
      "What Florida location launched the Apollo missions that carried astronauts to the Moon?",
    choices: ["MacDill AFB", "Eglin AFB", "Kennedy Space Center", "Homestead AFB"],
    answer: "Kennedy Space Center",
    fact:
      "Every Apollo Moon mission launched from Florida’s Space Coast at Kennedy Space Center.",
  },
  {
    question:
      "Which Florida educator and civil rights leader founded a school that became Bethune-Cookman University?",
    choices: ["Zora Neale Hurston", "Mary McLeod Bethune", "Harriet Tubman", "Rosa Parks"],
    answer: "Mary McLeod Bethune",
    fact:
      "Mary McLeod Bethune built one of Florida’s most important education and civil rights legacies.",
  },
  {
    question:
      "What transportation marvel connected mainland Florida to Key West?",
    choices: ["Florida Turnpike", "Overseas Railroad", "Cross Florida Canal", "Dixie Highway"],
    answer: "Overseas Railroad",
    fact:
      "The Overseas Railroad was one of the boldest engineering projects in American transportation history.",
  },
  {
    question:
      "During the Cuban Freedom Flights, approximately how many Cubans arrived in the United States through Miami?",
    choices: ["25,000", "75,000", "260,000+", "1 million"],
    answer: "260,000+",
    fact:
      "From 1965 to 1973, more than 260,000 Cubans came to the United States through Miami during the Freedom Flights.",
  },
  {
    question:
      "Bonus Challenge: Listen to America 250 Proof™ through approximately 1:30. Which historic event is referenced?",
    choices: [
      "The Pilgrims landing at Plymouth Rock",
      "The signing of the Declaration of Independence",
      "The first Moon landing",
      "The completion of the Transcontinental Railroad",
    ],
    answer: "The first Moon landing",
    fact:
      "The lyric references Neil Armstrong’s first steps on the Moon. The Apollo missions launched from Florida’s Space Coast.",
    bonus: true,
  },
];

export default function Quiz() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];
  const answered = selected !== "";
  const correct = selected === q.answer;

  function choose(choice: string) {
    if (answered) return;
    setSelected(choice);
    if (choice === q.answer) {
      setScore((prev) => prev + (q.bonus ? 2 : 1));
    }
  }

  function next() {
    if (current === questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrent((prev) => prev + 1);
    setSelected("");
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-white p-6 text-center">
        <div className="max-w-xl mx-auto">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">
            Florida History Hunter
          </h1>

          <p className="text-2xl mb-6">
            Your Score: <strong>{score}/11</strong>
          </p>

          <p className="text-lg text-gray-700 mb-8">
            You completed the Jacksonville Florida History Hunt Challenge.
          </p>

          <div className="space-y-4">
            <a
              href="https://www.youtube.com/watch?v=drnBrAmbNHE"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-red-600 text-white rounded-xl p-4 text-xl font-bold"
            >
              🎵 Listen to America 250 Proof™
            </a>

            <a
              href="https://america250proof.com/history-hunt.html?state=FL"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-blue-900 text-white rounded-xl p-4 text-xl font-bold"
            >
              Explore Full Florida History Hunt
            </a>

            <a
              href="/"
              className="block border-2 border-blue-900 text-blue-900 rounded-xl p-4 text-xl font-bold"
            >
              Play Again
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="max-w-xl mx-auto">
        <p className="text-sm font-bold text-red-600 mb-2">
          Question {current + 1} of {questions.length}
          {q.bonus ? " — Bonus Worth 2 Points" : ""}
        </p>

        {q.bonus && (
          <div className="mb-5 rounded-xl bg-yellow-100 border border-yellow-300 p-4">
            <p className="font-bold text-blue-900 mb-2">🎵 Bonus Challenge</p>
            <p className="text-sm text-gray-700 mb-3">
              Listen to the song through approximately 1:30 before answering.
            </p>
            <a
              href="https://www.youtube.com/watch?v=drnBrAmbNHE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-red-600 text-white rounded-lg px-4 py-2 font-bold"
            >
              Listen Now
            </a>
          </div>
        )}

        <h1 className="text-3xl font-bold text-blue-900 mb-6">{q.question}</h1>

        <div className="space-y-3">
          {q.choices.map((choice) => {
            const isSelected = selected === choice;
            const isCorrectAnswer = choice === q.answer;

            let style =
              "w-full border-2 border-blue-900 rounded-xl p-4 text-left text-lg font-semibold";

            if (answered && isSelected && correct) {
              style =
                "w-full border-2 border-green-600 bg-green-100 rounded-xl p-4 text-left text-lg font-semibold";
            } else if (answered && isSelected && !correct) {
              style =
                "w-full border-2 border-red-600 bg-red-100 rounded-xl p-4 text-left text-lg font-semibold";
            } else if (answered && isCorrectAnswer) {
              style =
                "w-full border-2 border-green-600 bg-green-50 rounded-xl p-4 text-left text-lg font-semibold";
            }

            return (
              <button key={choice} onClick={() => choose(choice)} className={style}>
                {answered && isSelected && correct ? "✅ " : ""}
                {answered && isSelected && !correct ? "❌ " : ""}
                {choice}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`mt-6 rounded-xl p-4 ${
              correct ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <p className="text-xl font-bold mb-2">
              {correct ? "✅ Correct!" : "❌ Not quite."}
            </p>

            <p className="text-gray-800">{q.fact}</p>

            <button
              onClick={next}
              className="mt-5 w-full bg-blue-900 text-white rounded-xl p-4 text-xl font-bold"
            >
              {current === questions.length - 1 ? "See Results" : "Next Question"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
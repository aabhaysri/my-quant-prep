import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/*
  Helper functions
*/
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(maxVal, maxDecimals) {
  // "Up to" maxDecimals means 0..maxDecimals possible
  const decimalsThisTime = getRandomInt(0, maxDecimals);
  const factor = 10 ** decimalsThisTime;
  const raw = Math.random() * maxVal;
  return Math.round(raw * factor) / factor;
}

/*
  Main App
*/
export default function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('HOME'); // HOME | MENTAL_MATH | CHART

  // On load, check localStorage for a saved username
  useEffect(() => {
    const saved = localStorage.getItem('quantUsername');
    if (saved) {
      setUsername(saved);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    if (!username.trim()) return;
    localStorage.setItem('quantUsername', username.trim());
    setIsLoggedIn(true);
  };

  // If not logged in, show a login page
  if (!isLoggedIn) {
    return (
      <div className="container-fluid p-0" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <div
          className="d-flex flex-column justify-content-center align-items-center"
          style={{ minHeight: '100vh' }}
        >
          <div className="text-center p-4 bg-white border rounded" style={{ maxWidth: 400 }}>
            <h1 className="mb-3">Welcome to Quant Prep</h1>
            <p>Please enter a username to track your progress.</p>
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleLogin}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If logged in, show a top-level UI with Home, Mental Math, and Chart
  return (
    <div className="container-fluid p-0">
      {/* Simple "navbar" */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
        <span className="navbar-brand">Quant Prep</span>
        <div className="ml-auto">
          <button className="btn btn-outline-light me-2" onClick={() => setCurrentView('HOME')}>
            Home
          </button>
          <button className="btn btn-outline-light me-2" onClick={() => setCurrentView('MENTAL_MATH')}>
            Mental Math
          </button>
          <button className="btn btn-outline-light" onClick={() => setCurrentView('CHART')}>
            Scores Chart
          </button>
        </div>
      </nav>

      {currentView === 'HOME' && <Home username={username} />}
      {currentView === 'MENTAL_MATH' && <MentalMath username={username} />}
      {currentView === 'CHART' && <ScoreChart username={username} />}
    </div>
  );
}

/*
  A more aesthetic "Home" page, with a hero banner.
*/
function Home({ username }) {
  return (
    <div
      className="d-flex flex-column justify-content-center align-items-center"
      style={{
        minHeight: '85vh',
        background:
          'linear-gradient(45deg, rgba(0, 123, 255, 0.7) 0%, rgba(40, 167, 69, 0.7) 100%)',
      }}
    >
      <div className="text-center text-white p-4" style={{ maxWidth: '600px' }}>
        <h1 className="mb-3" style={{ fontSize: '3rem', fontWeight: 'bold' }}>
          Hello, {username}!
        </h1>
        <p style={{ fontSize: '1.25rem' }}>
          Welcome to your Quant Prep hub. Here, you can practice Mental Math, track your performance
          over time, and sharpen your skills before your trading internship.
        </p>
        <p style={{ fontSize: '1.25rem' }}>
          Use the navigation above to get started. Good luck!
        </p>
      </div>
    </div>
  );
}

/*
  Mental Math Timed Challenge
  - 120s limit
  - Stores final score in localStorage with the key: "mentalMathHistory_<username>"
  - No "submit" button, auto-advances when correct
  - Example config for max digits/decimals for add/sub, plus toggles for add/sub/mult/div
*/
function MentalMath({ username }) {
  // Config for addition
  const [maxAddDigits, setMaxAddDigits] = useState(2);
  const [maxAddDecimals, setMaxAddDecimals] = useState(2);

  // Config for subtraction
  const [maxSubDigits, setMaxSubDigits] = useState(2);
  const [maxSubDecimals, setMaxSubDecimals] = useState(2);

  // Toggles for each operation
  const [includeAddition, setIncludeAddition] = useState(true);
  const [includeSubtraction, setIncludeSubtraction] = useState(true);
  const [includeMultiplication, setIncludeMultiplication] = useState(true);
  const [includeDivision, setIncludeDivision] = useState(true);

  // Timed quiz states
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState(0);

  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');

  const timerRef = useRef(null);

  const startChallenge = () => {
    if (secondsLeft > 0) return; // already running
    setScore(0);
    setSecondsLeft(120);
    generateQuestion();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          finishChallenge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishChallenge = () => {
    setQuestion('Time is up!');
    setCorrectAnswer(null);
    saveSessionScore(score);
  };

  function saveSessionScore(finalScore) {
    const key = `mentalMathHistory_${username}`;
    const existingData = localStorage.getItem(key);
    let arr = existingData ? JSON.parse(existingData) : [];
    arr.push({
      timestamp: new Date().toISOString(),
      score: finalScore,
    });
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function generateQuestion() {
    const ops = [];
    if (includeAddition) ops.push('+');
    if (includeSubtraction) ops.push('-');
    if (includeMultiplication) ops.push('*');
    if (includeDivision) ops.push('/');

    if (ops.length === 0) {
      setQuestion('No operations selected.');
      setCorrectAnswer(null);
      setUserAnswer('');
      return;
    }

    const chosenOp = ops[Math.floor(Math.random() * ops.length)];
    let a, b, result;

    if (chosenOp === '+') {
      // addition config
      const maxVal = 10 ** maxAddDigits - 1; // up to e.g. 99
      a = getRandomFloat(maxVal, maxAddDecimals);
      b = getRandomFloat(maxVal, maxAddDecimals);
      result = a + b;
    } else if (chosenOp === '-') {
      // subtraction config, ensure no negative result
      const maxVal = 10 ** maxSubDigits - 1;
      let x = getRandomFloat(maxVal, maxSubDecimals);
      let y = getRandomFloat(maxVal, maxSubDecimals);
      // ensure x >= y
      if (y > x) {
        const tmp = x;
        x = y;
        y = tmp;
      }
      a = x;
      b = y;
      result = a - b;
    } else if (chosenOp === '*') {
      // multiplication => whole numbers only
      // let's limit to up to 99
      a = getRandomInt(0, 99);
      b = getRandomInt(0, 99);
      result = a * b;
    } else {
      // division => whole numbers only
      let aa, bb;
      do {
        aa = getRandomInt(1, 99);
        bb = getRandomInt(1, 99);
      } while (bb === 0 || aa % bb !== 0);
      a = aa;
      b = bb;
      result = a / b;
    }

    setQuestion(`${a} ${chosenOp} ${b} = ?`);
    setCorrectAnswer(result);
    setUserAnswer('');
  }

  // Auto-check the typed answer
  const handleAnswerChange = (e) => {
    const val = e.target.value;
    setUserAnswer(val);

    if (secondsLeft > 0 && correctAnswer !== null) {
      const userVal = parseFloat(val);
      if (!isNaN(userVal)) {
        const epsilon = 1e-9;
        if (Math.abs(userVal - correctAnswer) < epsilon) {
          setScore((s) => s + 1);
          generateQuestion();
        }
      }
    }
  };

  return (
    <div className="container py-4">
      <h3>Timed Mental Math (120s)</h3>
      {secondsLeft === 0 && (
        <div className="card p-3 mb-3">
          <h5 className="card-title">Configuration</h5>
          <h6>Addition</h6>
          <div className="row mb-2">
            <div className="col-md-6">
              <label>Max Digits:</label>
              <input
                type="number"
                className="form-control"
                value={maxAddDigits}
                onChange={(e) => setMaxAddDigits(Number(e.target.value))}
                min="1"
                max="5"
              />
            </div>
            <div className="col-md-6">
              <label>Max Decimals:</label>
              <input
                type="number"
                className="form-control"
                value={maxAddDecimals}
                onChange={(e) => setMaxAddDecimals(Number(e.target.value))}
                min="0"
                max="3"
              />
            </div>
          </div>

          <h6>Subtraction</h6>
          <div className="row mb-2">
            <div className="col-md-6">
              <label>Max Digits:</label>
              <input
                type="number"
                className="form-control"
                value={maxSubDigits}
                onChange={(e) => setMaxSubDigits(Number(e.target.value))}
                min="1"
                max="5"
              />
            </div>
            <div className="col-md-6">
              <label>Max Decimals:</label>
              <input
                type="number"
                className="form-control"
                value={maxSubDecimals}
                onChange={(e) => setMaxSubDecimals(Number(e.target.value))}
                min="0"
                max="3"
              />
            </div>
          </div>

          <h6>Operations</h6>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="checkAdd"
              checked={includeAddition}
              onChange={(e) => setIncludeAddition(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="checkAdd">
              Addition
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="checkSub"
              checked={includeSubtraction}
              onChange={(e) => setIncludeSubtraction(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="checkSub">
              Subtraction
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="checkMul"
              checked={includeMultiplication}
              onChange={(e) => setIncludeMultiplication(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="checkMul">
              Multiplication (whole #)
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="checkDiv"
              checked={includeDivision}
              onChange={(e) => setIncludeDivision(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="checkDiv">
              Division (whole #)
            </label>
          </div>
        </div>
      )}

      <button className="btn btn-primary mb-3" onClick={startChallenge}>
        Start 120s Challenge
      </button>

      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }} className="mb-2">
        Time Left: {secondsLeft}s
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }} className="mb-2">
        Score: {score}
      </div>

      <div
        className="p-3 text-center"
        style={{
          border: '2px solid #777',
          backgroundColor: '#fff',
          minHeight: '120px'
        }}
      >
        <div
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '1rem'
          }}
        >
          {question}
        </div>
        {secondsLeft > 0 && correctAnswer !== null && (
          <input
            type="text"
            className="form-control mx-auto"
            style={{ fontSize: '1.5rem', maxWidth: '300px' }}
            value={userAnswer}
            onChange={handleAnswerChange}
          />
        )}
      </div>
    </div>
  );
}

/*
  Chart of Past Scores
*/
function ScoreChart({ username }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const key = `mentalMathHistory_${username}`;
    const existing = localStorage.getItem(key);
    if (existing) {
      setHistory(JSON.parse(existing));
    }
  }, [username]);

  if (history.length === 0) {
    return (
      <div className="container py-4">
        <h4>No past sessions found.</h4>
        <p>Try completing a mental math session!</p>
      </div>
    );
  }

  const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const labels = sorted.map((_, i) => `Attempt #${i + 1}`);
  const scores = sorted.map((item) => item.score);

  const data = {
    labels,
    datasets: [
      {
        label: 'Mental Math Score',
        data: scores,
        borderColor: 'rgba(75,192,192,1)',
        fill: false
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Mental Math Scores Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="container py-4">
      <h2>Score Chart</h2>
      <Line data={data} options={options} />
    </div>
  );
}

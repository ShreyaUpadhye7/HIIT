// App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import logoImage from './assets/logo.png';
import './App.css';

// --- Data for the Questionnaire ---
const questions = [
    { id: 1, text: "It would be difficult for me to refuse if someone placed alcohol in front of me.", subscale: 1, reversed: false },
    { id: 2, text: "If someone held alcohol under my nose, I would not be able to refuse it.", subscale: 1, reversed: false },
    { id: 3, text: "I would drink alcohol if my friends offered it to me on a street.", subscale: 1, reversed: false },
    { id: 4, text: "I would drink alcohol if I am alone.", subscale: 1, reversed: false },
    { id: 5, text: "If my friend gave me alcohol, I would drink it even in the hospital.", subscale: 1, reversed: false },
    { id: 6, text: "If alcohol is placed in front of me, I would drink it.", subscale: 1, reversed: false },
    { id: 7, text: "I might drink alcohol at a party or a gathering.", subscale: 1, reversed: false },
    { id: 8, text: "I am annoyed by words from others.", subscale: 2, reversed: false },
    { id: 9, text: "I am irritated.", subscale: 2, reversed: false },
    { id: 10, text: "I am not motivated to do anything.", subscale: 2, reversed: false },
    { id: 11, text: "I feel lonely.", subscale: 2, reversed: false },
    { id: 12, text: "I feel bored.", subscale: 2, reversed: false },
    { id: 13, text: "I am anxious about my future.", subscale: 2, reversed: false },
    { id: 14, text: "I cannot control my feeling.", subscale: 2, reversed: false },
    { id: 15, text: "I would do almost anything in order to drink alcohol.", subscale: 3, reversed: false },
    { id: 16, text: "I have significant job-related problems.", subscale: 3, reversed: false },
    { id: 17, text: "I would do anything to get money for alcohol.", subscale: 3, reversed: false },
    { id: 18, text: "I want alcohol even if I have to steal.", subscale: 3, reversed: false },
    { id: 19, text: "I can stop drinking alcohol by myself.", subscale: 4, reversed: true },
    { id: 20, text: "If I drink a small amount of alcohol, I would not be able to stop drinking.", subscale: 4, reversed: true },
    { id: 21, text: "I am confident that I would not drink alcohol again.", subscale: 4, reversed: true },
    { id: 22, text: "I would be fine without alcohol.", subscale: 4, reversed: true },
    { id: 23, text: "I have already recovered from alcohol abuse.", subscale: 4, reversed: true },
    { id: 24, text: "I would not be able to control myself if I drink alcohol.", subscale: 4, reversed: true },
    { id: 25, text: "If I drink alcohol, it would badly influence my job.", subscale: 5, reversed: true },
    { id: 26, text: "I think I am an addict.", subscale: 5, reversed: false },
    { id: 27, text: "I would feel restless if I drank alcohol.", subscale: 5, reversed: true },
];

// --- Helper Components ---
const Logo = () => (
    <div className="logo-container">
        <img src={logoImage} alt="Logo" className="logo-img" />
        <span className="logo-text">Handwriting Analysis</span>
    </div>
);

const Header = ({ setPage, isLoggedIn, setIsLoggedIn, setCurrentUser }) => {
    const handleLogout = () => {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setPage('home');
        localStorage.clear();
    };

    return (
        <header className="header">
            <nav className="nav container">
                <div onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
                    <Logo />
                </div>
                <ul className="nav-links">
                    {isLoggedIn ? (
                        <>
                            <li><a href="#" onClick={() => setPage('dashboard')}>Dashboard</a></li>
                            <li><a href="#" onClick={() => setPage('history')}>History</a></li>
                            <li><a href="#" onClick={() => setPage('profile')}>Profile</a></li>
                            <li><button onClick={handleLogout} className="nav-button logout-button">Logout</button></li>
                        </>
                    ) : (
                        <>
                            <li><a href="#" onClick={() => setPage('home')}>Home</a></li>
                            <li><a href="#" onClick={() => setPage('about')}>About Us</a></li>
                            <li><button onClick={() => setPage('auth')} className="nav-button">Sign In</button></li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
};

const Footer = () => (
    <footer className="footer">
        <div className="container">
            <div className="social-links">
                <a href="#">Facebook</a>
                <a href="#">Twitter</a>
                <a href="#">LinkedIn</a>
            </div>
            <p>drugalcohol07@gmail.co | 9148561398</p>
            <p>&copy; {new Date().getFullYear()} Handwriting Analysis. All rights reserved.</p>
        </div>
    </footer>
);

const HomePage = ({ setPage }) => (
    <>
        <section className="hero-section">
            <div className="container">
                <h1>Analyze Handwriting, Understand the Mind</h1>
                <p>AI-powered insights into relapse and recovery for alcohol dependency through graphology.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2rem' }}>
                    <button onClick={() => setPage('auth', 'Counselor')} className="nav-button hero-button">I'm a Counselor</button>
                    <button onClick={() => setPage('auth', 'Graphologist')} className="nav-button hero-button">I'm a Graphologist</button>
                    <button onClick={() => setPage('auth', 'Researcher')} className="nav-button hero-button">I'm a Researcher</button>
                </div>
            </div>
        </section>
    </>
);

const generatePID = (userId) => {
    if (!userId) return null;
    return `P-${userId.substring(userId.length - 6).toUpperCase()}`;
};

const AuthPage = ({ setPage, setIsLoggedIn, setCurrentUser, setIsFirstLogin, role }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userType, setUserType] = useState(role || 'Patient');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [tempData, setTempData] = useState({});
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => {
                setCooldown(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    const finalizeLogin = async (data) => {
        localStorage.setItem('userToken', data.token);

        const userWithPID = {
            ...data.user,
            pid: generatePID(data.user._id)
        };
        setCurrentUser(userWithPID);

        setIsLoggedIn(true);
        setIsFirstLogin(data.isFirstLogin);

        // For patients, we fetch their history on login
        if (userWithPID.userType === 'Patient') {
            const historyRes = await fetch(`http://localhost:5001/api/history/${data.user._id}`, {
                headers: { 'Authorization': `Bearer ${data.token}` }
            });
            const historyData = await historyRes.json();
            if (historyRes.ok) {
                localStorage.setItem('userHistory', JSON.stringify(historyData));
            }
        }
        setPage('dashboard');
    };

    const handleSubmitStep1 = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (isRegister) {
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
            try {
                const res = await fetch('http://localhost:5001/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, phone, password, userType, name, dob })
                });
                const data = await res.json();
                if (!res.ok) {
                    if (res.status === 429) {
                        setError(data.message);
                        const match = data.message.match(/(\d+)\s*minutes?/i);
                        if (match) setCooldown(parseInt(match[1]) * 60);
                    } else {
                        throw new Error(data.message || 'Registration failed');
                    }
                    return;
                }
                setTempData({ email, phone, password, userType, name, dob });
                setMessage('OTP sent to your email. Please enter it below.');
                setStep(2);
            } catch (err) {
                setError(err.message);
            }
        } else if (isForgotPassword) {
            try {
                const res = await fetch('http://localhost:5001/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (!res.ok) {
                    if (res.status === 429) {
                        setError(data.message);
                        const match = data.message.match(/(\d+)\s*minutes?/i);
                        if (match) setCooldown(parseInt(match[1]) * 60);
                    } else {
                        throw new Error(data.message || 'Failed to send reset link');
                    }
                    return;
                }
                setMessage('A password reset link has been sent to your email.');
                setIsForgotPassword(false);
            } catch (err) {
                setError(err.message);
            }
        } else { // Login
            try {
                const res = await fetch('http://localhost:5001/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Login failed');

                await finalizeLogin(data);

            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handleSubmitStep2 = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const res = await fetch('http://localhost:5001/api/verify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...tempData, otp })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'OTP verification failed');

            await finalizeLogin({ ...data, isFirstLogin: true });

        } catch (err) {
            setError(err.message);
        }
    };

    const handleResendOTP = async () => {
        setError('');
        setMessage('');
        try {
            const res = await fetch('http://localhost:5001/api/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: tempData.email })
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 429) {
                    setError(data.message);
                    const match = data.message.match(/(\d+)\s*minutes?/i);
                    if (match) setCooldown(parseInt(match[1]) * 60);
                } else {
                    throw new Error(data.message || 'Failed to resend OTP');
                }
                return;
            }
            setMessage('New OTP resent to your email.');
            setCooldown(60);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-left">
                    <img src={logoImage} alt="App Logo" className="logo-img" style={{ height: '100px', width: '100px' }} />
                    <h1 style={{ fontSize: '2rem', marginTop: '1rem' }}>HITT:Hidden Intent Tracing Tool</h1>
                    <p>Tool for Alcohol-Dependent Patient</p>
                </div>
                <div className="auth-right">
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        {isForgotPassword ? 'Reset Password' : isRegister ? 'Create Account' : 'Sign In'}
                    </h2>
                    {error && <p className="auth-error">{error}</p>}
                    {message && <p className="auth-message">{message}</p>}
                    {step === 1 && (
                        <form onSubmit={handleSubmitStep1} className="auth-form">
                            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            {isRegister && (
                                <>
                                    <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                                    <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                                </>
                            )}
                            {!isForgotPassword && (
                                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength="8" required />
                            )}
                            {isRegister && (
                                <>
                                    <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                    <select value={userType} onChange={(e) => setUserType(e.target.value)} disabled={!!role}>
                                        <option>Patient</option>
                                        <option>Counselor</option>
                                        <option>Researcher</option>
                                        <option>Graphologist</option>
                                    </select>
                                </>
                            )}
                            <button type="submit" className="nav-button" disabled={cooldown > 0}>
                                {cooldown > 0 ? `Wait ${cooldown} sec(s)` : (isForgotPassword ? 'Send Reset Link' : isRegister ? 'Register' : 'Sign In')}
                            </button>
                            {!isRegister && !isForgotPassword && (
                                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setIsRegister(true); }}
                                        style={{ color: '#2563eb', textDecoration: 'underline' }}
                                    >
                                        New user? Register
                                    </a>
                                    <br />
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setEmail(''); setPassword(''); }}
                                        style={{ color: '#2563eb', textDecoration: 'underline' }}
                                    >
                                        Forgot Password?
                                    </a>
                                </p>
                            )}
                            {isForgotPassword && (
                                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setEmail(''); }}
                                        style={{ color: '#2563eb', textDecoration: 'underline' }}
                                    >
                                        Back to Sign In
                                    </a>
                                </p>
                            )}
                        </form>
                    )}
                    {step === 2 && (
                        <form onSubmit={handleSubmitStep2} className="auth-form">
                            <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength="6" required />
                            <button type="submit" className="nav-button">Verify OTP</button>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                className="nav-button"
                                style={{ backgroundColor: '#d1d5db', color: '#1f2937' }}
                                disabled={cooldown > 0}
                            >
                                {cooldown > 0 ? `Resend in ${cooldown} sec(s)` : 'Resend OTP'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResetPasswordPage = ({ setPage }) => {
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setError('Invalid or missing reset token.');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            const res = await fetch('http://localhost:5001/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to reset password');
            setMessage('Password reset successfully! You can now sign in with your new password.');
            setTimeout(() => {
                window.history.pushState({}, '', '/');
                setPage('auth');
            }, 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-left">
                    <img src={logoImage} alt="App Logo" className="logo-img" style={{ height: '100px', width: '100px' }} />
                    <h1 style={{ fontSize: '2rem', marginTop: '1rem' }}>Handwriting Analysis</h1>
                    <p>for Relapse/Recovery Prediction</p>
                </div>
                <div className="auth-right">
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Reset Password</h2>
                    {error && <p className="auth-error">{error}</p>}
                    {message && <p className="auth-message">{message}</p>}
                    <form onSubmit={handleSubmit} className="auth-form">
                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            minLength="8"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            minLength="8"
                            required
                        />
                        <button type="submit" className="nav-button">Reset Password</button>
                        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); setPage('auth'); }}
                                style={{ color: '#2563eb', textDecoration: 'underline' }}
                            >
                                Back to Sign In
                            </a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

const DisclaimerModal = ({ onAccept, onDecline, isManualView = false }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2>Disclaimer</h2>
            <p>
                This tool is specifically designed for <strong>Alcohol Dependent Patients</strong> and is not intended for the analysis of any other drug dependencies.
                <br /><br />
                Please be aware that the accuracy of this tool may be limited as it has been trained on a very small dataset. The results provided should not be considered definitive medical advice.
                <br /><br />
                <strong>I have read and understood this description and proceed at my own risk.</strong>
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                {isManualView ? (
                    <button onClick={onDecline} className="nav-button">Close</button>
                ) : (
                    <>
                        <button onClick={onDecline} className="nav-button" style={{ backgroundColor: '#dc2626', color: 'white' }}>Decline</button>
                        <button onClick={onAccept} className="nav-button">Accept</button>
                    </>
                )}
            </div>
        </div>
    </div>
);

const ConsentModal = ({ onAgree, onDecline, patientName }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2>Share for Research?</h2>
            <p>
                To improve the accuracy of our AI analysis, we rely on expert graphologists to review handwriting samples.
                <br /><br />
                Does the patient, <strong>{patientName}</strong>, consent to share their anonymized handwriting sample with a certified graphologist for research purposes?
                <br /><br />
                <strong>The patient's personal information will NOT be shared.</strong> Only the image of their script and their anonymous Patient ID will be used.
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={onDecline} className="nav-button" style={{ backgroundColor: '#6b7280', color: 'white' }}>No, Decline</button>
                <button onClick={onAgree} className="nav-button">Yes, I Agree</button>
            </div>
        </div>
    </div>
);


const QuestionnaireModal = ({ setShowModal, onComplete }) => {
    const [answers, setAnswers] = useState({});
    const [showQuestions, setShowQuestions] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setShowQuestions(true);
        }, 500);
        return () => clearTimeout(timeout);
    }, []);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: parseInt(value) }));
    };

    const subscaleDescriptions = {
        1: 'craving (alcohol craving)',
        2: 'emotion (negative feelings)',
        3: 'motive (economic/job-related problems)',
        4: 'self-control (lack of self-control)',
        5: 'consequence (negative consequences of drinking)',
    };

    const calculateResult = () => {
        const scores = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        const rawAnswers = {};

        questions.forEach(q => {
            const answer = answers[q.id];
            if (answer === undefined) return;
            let score = answer;
            if (q.reversed) {
                score = 4 - answer;
            }
            scores[q.subscale].push(score);
            rawAnswers[q.id] = {
                text: q.text,
                answer: ['Strongly Disagree (X)', 'Neither (△)', 'Strongly Agree (○)'][answer - 1],
                score: score,
            };
        });

        const subscaleScores = [];
        for (const subscale in scores) {
            if (scores[subscale].length > 0) {
                const sum = scores[subscale].reduce((a, b) => a + b, 0);
                const avg = sum / scores[subscale].length;
                subscaleScores.push({
                    subscaleId: subscale,
                    description: subscaleDescriptions[subscale],
                    average: avg.toFixed(2),
                });
            }
        };

        if (subscaleScores.length < Object.keys(subscaleDescriptions).length) return "Incomplete";

        const totalSum = subscaleScores.reduce((acc, curr) => acc + parseFloat(curr.average), 0);
        const totalArrs = totalSum / subscaleScores.length;
        const outcome = totalArrs <= 2.00 ? 'Recovery' : 'Relapse Risk';

        return {
            outcome,
            score: totalArrs.toFixed(2),
            subscaleScores,
            rawAnswers,
        };
    };

    const handleSubmit = () => {
        if (Object.keys(answers).length < questions.length) {
            alert("Please answer all questions before submitting.");
            return;
        }
        const result = calculateResult();
        if (result === "Incomplete") {
            alert("Calculation error. Please ensure all questions are answered.");
            return;
        }
        onComplete(result);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>ARRS Questionnaire</h2>
                <p>Please answer the following questions based on your state during the past week.</p>
                <div className={`question-list ${showQuestions ? 'visible' : ''}`} style={{ marginTop: '1.5rem' }}>
                    {questions.map((q, index) => (
                        <div key={q.id} className="question-item" style={{ animationDelay: `${index * 0.05}s` }}>
                            <p><strong>{index + 1}. {q.text}</strong></p>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <label><input type="radio" name={`q${q.id}`} value="1" onChange={(e) => handleAnswerChange(q.id, e.target.value)} /> Strongly Disagree (X)</label>
                                <label><input type="radio" name={`q${q.id}`} value="2" onChange={(e) => handleAnswerChange(q.id, e.target.value)} /> Neither (△)</label>
                                <label><input type="radio" name={`q${q.id}`} value="3" onChange={(e) => handleAnswerChange(q.id, e.target.value)} /> Strongly Agree (○)</label>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={() => setShowModal(false)} className="nav-button" style={{ backgroundColor: '#d1d5db', color: '#1f2937' }}>Cancel</button>
                    <button onClick={handleSubmit} className="nav-button">Submit Answers</button>
                </div>
            </div>
        </div>
    );
};

const GaugeChart = ({ percentage, outcome, title }) => {
    const [animatedPercentage, setAnimatedPercentage] = useState(0);

    const radius = 85;
    const strokeWidth = 20;
    const circumference = radius * Math.PI;

    useEffect(() => {
        const animation = requestAnimationFrame(() => {
            setAnimatedPercentage(percentage);
        });
        return () => cancelAnimationFrame(animation);
    }, [percentage]);

    const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;
    const finalColor = outcome === 'Recovery' ? "#16a34a" : "#dc2626";

    return (
        <div className="gauge-container">
            <h4>{title}</h4>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <svg width="220" height="130" viewBox="0 0 220 130" style={{ display: 'block' }}>
                    <path
                        d={`M ${10 + strokeWidth / 2},110 A ${radius},${radius} 0 0 1 ${210 - strokeWidth / 2},110`}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${10 + strokeWidth / 2},110 A ${radius},${radius} 0 0 1 ${210 - strokeWidth / 2},110`}
                        fill="none"
                        stroke={finalColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                    />
                </svg>
                <div className="gauge-text" style={{ color: finalColor }}>
                    <span className="gauge-percentage">{percentage.toFixed(0)}%</span>
                    <span className="gauge-label">{outcome === 'Recovery' ? 'Certainty in Recovery' : 'Relapse Risk Level'}</span>
                </div>
            </div>
        </div>
    );
};

const DetailedResults = ({ analysisResult }) => {

    const handwritingConfidence = useMemo(() => {
        const scores = analysisResult.imageAnalysis.scores || { recovery: 0.5, relapse: 0.5 };
        const { recovery, relapse } = scores;
        const total = recovery + relapse;

        if (total === 0) return 50;

        const confidence = (Math.max(recovery, relapse) / total) * 100;
        return confidence;
    }, [analysisResult.imageAnalysis.scores]);

    const questionnaireConfidence = useMemo(() => {
        const score = parseFloat(analysisResult.questionnaireAnalysis.score);
        const deviation = Math.abs(score - 2.0);
        const confidence = 50 + (deviation * 50);
        return confidence;
    }, [analysisResult.questionnaireAnalysis.score]);

    const featureBreakdown = useMemo(() => {
        const features = analysisResult.imageAnalysis.features;
        if (!features) return [];

        const featureMap = {
            pressure: "Pressure",
            spacing: "Word Spacing",
            g_loop: "G-Loop",
            y_loop: "Y-Loop",
            d_height: "D-Height",
            d_loop: "D-Loop",
            t_height: "T-Height",
            t_bar: "T-Bar",
            t_lean: "T-Lean"
        };

        return Object.entries(features).map(([key, value]) => ({
            name: featureMap[key] || key,
            value: value,
        }));
    }, [analysisResult.imageAnalysis.features]);

    // Define traits to highlight based on outcome (Relapse Risk vs. Recovery)
    const highImpactTraits = {
        'Relapse Risk': ['pressure', 'spacing', 'y_loop'],
        'Recovery': ['t_bar', 't_height', 'd_loop']
    };

    const outcome = analysisResult.imageAnalysis.outcome;
    const traitsToHighlight = highImpactTraits[outcome] || [];

    return (
        <div className="results-container">
            <div className="summary-section">
                <div className="analysis-column">
                    <div className="result-indicator" style={{ color: analysisResult.imageAnalysis.outcome === 'Recovery' ? '#16a34a' : '#dc2626' }}>
                        <p>{analysisResult.imageAnalysis.outcome}</p>
                    </div>
                    <GaugeChart
                        title="Handwriting Analysis"
                        percentage={handwritingConfidence}
                        outcome={analysisResult.imageAnalysis.outcome}
                    />
                </div>
                <div className="analysis-column">
                    <div className="result-indicator" style={{ color: analysisResult.questionnaireAnalysis.outcome === 'Recovery' ? '#16a34a' : '#dc2626' }}>
                        <p>{analysisResult.questionnaireAnalysis.outcome}</p>
                    </div>
                    <GaugeChart
                        title="Questionnaire Analysis"
                        percentage={questionnaireConfidence}
                        outcome={analysisResult.questionnaireAnalysis.outcome}
                    />
                </div>
            </div>

            <div className="analysis-graphs">
                <div className="graph-card">
                    <h4>Graphological Feature Analysis</h4>
                    <div className="result-bars-container">
                        {analysisResult.graphData.map((item, index) => (
                            <div key={index} className="result-bar-item">
                                <span className="result-bar-label">{item.label}: {item.value}</span>
                                <div className="result-bar-wrapper">
                                    <div className="result-bar" style={{
                                        width: `${(item.value / (analysisResult.graphData.reduce((sum, i) => sum + i.value, 0) || 1)) * 100}%`,
                                        backgroundColor: item.label.includes('Recovery') ? '#16a34a' : '#dc2626'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="graph-card">
                    <h4>Questionnaire Subscale Scores</h4>
                    <div className="result-bars-container">
                        {analysisResult.questionnaireAnalysis.subscaleScores.map((item, index) => {
                            const isRelapseRisk = parseFloat(item.average) >= 2.0;
                            const color = isRelapseRisk ? '#dc2626' : '#16a34a';
                            const progress = ((parseFloat(item.average) - 1) / 2) * 100;
                            return (
                                <div key={index} className="result-bar-item">
                                    <span className="result-bar-label" style={{ color: color }}>{item.description}: {item.average}</span>
                                    <div className="result-bar-wrapper">
                                        <div className="result-bar" style={{ width: `${progress}%`, backgroundColor: color }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="feature-breakdown-container card">
                <h4>Handwriting Feature Breakdown</h4>
                <div className="feature-list">
                    {featureBreakdown.map((feature, index) => {
                        const featureKey = Object.keys(analysisResult.imageAnalysis.features).find(key => analysisResult.imageAnalysis.features[key] === feature.value);
                        const isHighlighted = highImpactTraits[outcome]?.includes(featureKey);
                        const highlightClass = isHighlighted ? (outcome === 'Relapse Risk' ? 'highlight-relapse' : 'highlight-recovery') : '';
                        return (
                            <div key={index} className={`feature-item ${highlightClass}`}>
                                <span className="feature-name">{feature.name}:</span>
                                <span className="feature-value">{feature.value}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


const EditProfileModal = ({ currentUser, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        dob: currentUser.dob ? new Date(currentUser.dob).toISOString().split('T')[0] : ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('userToken');
            const res = await fetch('http://localhost:5001/api/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: currentUser.email, ...formData })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update profile');
            onSave(data.user);
        } catch (err) {
            alert('Error updating profile: ' + err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit Profile</h2>
                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '1rem' }}>
                    <div>
                        <label>Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div>
                        <label>Phone</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>
                    <div>
                        <label>Date of Birth</label>
                        <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
                    </div>
                    <div>
                        <label>Email (Cannot be changed)</label>
                        <input type="email" value={currentUser.email} disabled />
                    </div>
                    <div>
                        <label>User Type (Cannot be changed)</label>
                        <input type="text" value={currentUser.userType} disabled />
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="nav-button" style={{ backgroundColor: '#d1d5db', color: '#1f2937' }}>Cancel</button>
                        <button type="submit" className="nav-button">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RegisterPatientForm = ({ onRegister }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        dob: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            const res = await fetch('http://localhost:5001/api/counselor/register-patient', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to register patient');

            onRegister(data.patient);
            setMessage('Patient registered successfully!');
            setFormData({ email: '', password: '', name: '', phone: '', dob: '' });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="card">
            <h3>Register New Patient</h3>
            {message && <p className="auth-message">{message}</p>}
            {error && <p className="auth-error">{error}</p>}
            <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '1rem' }}>
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} minLength="8" required />
                <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
                <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required />
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
                <button type="submit" className="nav-button">Register Patient</button>
            </form>
        </div>
    );
};

const CounselorDashboard = ({ currentUser }) => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPatients = async () => {
            setIsLoading(true);
            try {
                // Try to load from localStorage first for immediate display
                const cachedPatients = localStorage.getItem(`counselor_patients_${currentUser._id}`);
                if (cachedPatients) {
                    setPatients(JSON.parse(cachedPatients));
                }

                // Then fetch fresh data from server
                const token = localStorage.getItem('userToken');
                const res = await fetch('http://localhost:5001/api/counselor/patients', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setPatients(data);
                    // Cache the data for next time
                    localStorage.setItem(`counselor_patients_${currentUser._id}`, JSON.stringify(data));
                }
            } catch (err) {
                console.error('Error fetching patients:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPatients();
    }, [currentUser._id]);

    const handleRegisterPatient = (newPatient) => {
        const updatedPatients = [newPatient, ...patients];
        setPatients(updatedPatients);
        setIsRegistering(false);
        // Update cache immediately
        localStorage.setItem(`counselor_patients_${currentUser._id}`, JSON.stringify(updatedPatients));
    };

    const handleViewPatient = (patient) => {
        setSelectedPatient(patient);
    };

    const PatientDashboardForCounselor = ({ patient, onBack }) => {
        const [history, setHistory] = useState([]);
        const [isProcessing, setIsProcessing] = useState(false);
        const [showQuestionnaire, setShowQuestionnaire] = useState(false);
        const [analysisResult, setAnalysisResult] = useState(null);
        const [file, setFile] = useState(null);
        const [fileName, setFileName] = useState('');
        const [showDetailedResults, setShowDetailedResults] = useState(false);
        const [processingStep, setProcessingStep] = useState(0);
        const [showConsentModal, setShowConsentModal] = useState(false);
        const [latestAnalysisId, setLatestAnalysisId] = useState(null);
        const [canSubmit, setCanSubmit] = useState(true);
        const [lastSubmissionDate, setLastSubmissionDate] = useState(null);

        useEffect(() => {
            const fetchHistoryAndStatus = async () => {
                const token = localStorage.getItem('userToken');
                try {
                    const [historyRes, statusRes] = await Promise.all([
                        fetch(`http://localhost:5001/api/history/${patient._id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                        fetch(`http://localhost:5001/api/counselor/submission-status/${patient._id}`, { headers: { 'Authorization': `Bearer ${token}` } })
                    ]);

                    const historyData = await historyRes.json();
                    if (historyRes.ok) setHistory(historyData);

                    const statusData = await statusRes.json();
                    if (statusRes.ok) {
                        setCanSubmit(statusData.canSubmit);
                        setLastSubmissionDate(statusData.lastSubmissionDate);
                    }
                } catch (err) {
                    console.error('Error fetching patient data:', err);
                }
            };
            fetchHistoryAndStatus();
        }, [patient]);

        const handleFileChange = (e) => {
            if (e.target.files.length > 0) {
                setFile(e.target.files[0]);
                setFileName(e.target.files[0].name);
            }
        };

        const handleAnalyze = async () => {
            if (!file) {
                alert("Please select a file to upload.");
                return;
            }

            if (!canSubmit) {
                const lastDate = new Date(lastSubmissionDate);
                const nextDate = new Date(lastDate.setDate(lastDate.getDate() + 20));
                alert(`The patient must wait 20 days between uploads. Next submission available: ${nextDate.toLocaleDateString()}.`);
                return;
            }

            setIsProcessing(true);
            setAnalysisResult(null);
            setShowDetailedResults(false);
            setProcessingStep(1);

            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('patientId', patient._id);
                formData.append('patientPID', patient.pid);
                const token = localStorage.getItem('userToken');

                const uploadRes = await fetch('http://localhost:5001/api/upload-sample', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) {
                    throw new Error(uploadData.message || 'Failed to upload sample');
                }

                setLatestAnalysisId(uploadData.sampleId);

                setTimeout(() => {
                    setAnalysisResult({
                        imageAnalysis: {
                            outcome: uploadData.aiPrediction,
                            confidence: uploadData.confidence,
                            scores: uploadData.scores,
                            features: uploadData.features
                        },
                        graphData: [
                            { label: 'Recovery Indicators', value: uploadData.scores.recovery },
                            { label: 'Relapse Risk Indicators', value: uploadData.scores.relapse }
                        ]
                    });
                    setProcessingStep(2);
                    setShowQuestionnaire(true);
                }, 1500);
            } catch (err) {
                alert('Error uploading sample: ' + err.message);
                setIsProcessing(false);
                setProcessingStep(0);
            }
        };

        const handleConsentResponse = async (consent) => {
            setShowConsentModal(false);
            try {
                const token = localStorage.getItem('userToken');
                await fetch('http://localhost:5001/api/counselor/consent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ patientId: patient._id, sampleId: latestAnalysisId, consent: consent })
                });
            } catch (err) {
                console.error('Failed to save consent:', err);
            }
            setShowDetailedResults(true);
        };


        const handleQuestionnaireComplete = async (qResult) => {
            setProcessingStep(3);

            const finalResult = {
                id: latestAnalysisId,
                date: new Date().toISOString(),
                patientId: patient._id,
                imageAnalysis: analysisResult.imageAnalysis,
                questionnaireAnalysis: qResult,
                combinedOutcome: analysisResult.imageAnalysis.outcome,
                graphData: analysisResult.graphData,
            };

            try {
                const token = localStorage.getItem('userToken');
                const res = await fetch('http://localhost:5001/api/save-analysis', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(finalResult)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Failed to save analysis');

                setAnalysisResult(finalResult);
                setHistory([finalResult, ...history]);

                setShowQuestionnaire(false);
                setTimeout(() => {
                    setIsProcessing(false);
                    setFile(null);
                    setFileName('');
                    setShowConsentModal(true);
                }, 1500);
            } catch (err) {
                alert('Error saving analysis: ' + err.message);
                setIsProcessing(false);
                setProcessingStep(0);
            }
        };

        const submissionMessage = canSubmit ?
            `You can submit a new script now.` :
            `The patient must wait 20 days between uploads. Next submission available: ${lastSubmissionDate ? new Date(new Date(lastSubmissionDate).setDate(new Date(lastSubmissionDate).getDate() + 20)).toLocaleDateString() : 'N/A'}`;

        return (
            <div className="counselor-patient-dashboard">
                <button onClick={onBack} className="nav-button" style={{ marginBottom: '1.5rem', backgroundColor: '#4b5563' }}>← Back to Patient List</button>
                <div className="page-banner">
                    <h2>Patient Dashboard: {patient.name} ({patient.pid})</h2>
                    <p>Manage and analyze scripts for this patient.</p>
                </div>
                {showQuestionnaire && <QuestionnaireModal setShowModal={setShowQuestionnaire} onComplete={handleQuestionnaireComplete} />}
                {showConsentModal && <ConsentModal onAgree={() => handleConsentResponse(true)} onDecline={() => handleConsentResponse(false)} patientName={patient.name} />}

                <div className="dashboard-grid">
                    <div className="dashboard-section">
                        <div className="card">
                            <h3>1. Upload Patient Script</h3>
                            <p>Upload a clear image of the handwritten script for analysis.</p>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" style={{ marginTop: '1rem' }} disabled={!canSubmit || isProcessing} />
                            {fileName && <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Selected: {fileName}</p>}
                            <button onClick={handleAnalyze} disabled={!canSubmit || isProcessing} className="nav-button" style={{ width: '100%', marginTop: '1rem' }}>
                                {isProcessing ? 'Processing...' : 'Analyze Handwriting'}
                            </button>
                            <p style={{ textAlign: 'center', marginTop: '0.5rem', color: canSubmit ? '#333' : '#dc2626' }}>{submissionMessage}</p>
                        </div>
                        <div className="card">
                            <h3>Sample Script to Write</h3>
                            <p>Ask the patient to write the following text on a plain sheet of paper and provide you with the image.</p>
                            <div className="sample-script" style={{ marginTop: '1rem' }}>
                                "In the gentle yet dynamic world of growth, every tiny detail matters. I gathered energy to try different methods, yet determination guided my path. The gateway to deep understanding requires effort and trust. Every good deed defines the integrity I choose daily. I let go of guilt, embracing today with a grateful heart."
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <h3>2. Analysis and Result</h3>
                        {isProcessing && (
                            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                                <div className="spinner"></div>
                                <p style={{ marginTop: '1rem', color: '#4b5563' }}>
                                    {processingStep === 1 && 'Analyzing image...'}
                                    {processingStep === 2 && 'Image analysis complete. Showing questionnaire...'}
                                    {processingStep === 3 && 'Finalizing results...'}
                                </p>
                            </div>
                        )}
                        {!analysisResult && !isProcessing && <p>The analysis results will be displayed here.</p>}
                        {showDetailedResults && analysisResult && (
                            <DetailedResults analysisResult={analysisResult} />
                        )}
                    </div>
                </div>

                <div className="card full-width" style={{ marginTop: '2rem' }}>
                    <h3>Patient's Analysis History</h3>
                    <HistoryPage currentUser={patient} history={history} />
                </div>
            </div>
        );
    };

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            {selectedPatient ? (
                <PatientDashboardForCounselor patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
            ) : (
                <>
                    <div className="page-banner">
                        <h2>Counselor Dashboard</h2>
                        <p>Manage your patients and their analysis history.</p>
                    </div>
                    <div className="dashboard-grid">
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>My Patients ({patients.length})</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => {
                                            // Refresh patients list
                                            const fetchPatients = async () => {
                                                setIsLoading(true);
                                                try {
                                                    const token = localStorage.getItem('userToken');
                                                    const res = await fetch('http://localhost:5001/api/counselor/patients', {
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        setPatients(data);
                                                        localStorage.setItem(`counselor_patients_${currentUser._id}`, JSON.stringify(data));
                                                    }
                                                } catch (err) {
                                                    console.error('Error fetching patients:', err);
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            };
                                            fetchPatients();
                                        }}
                                        className="nav-button"
                                        style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', fontSize: '0.875rem' }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Loading...' : 'Refresh'}
                                    </button>
                                    <button onClick={() => setIsRegistering(!isRegistering)} className="nav-button" style={{ padding: '0.5rem 1rem' }}>
                                        {isRegistering ? 'Cancel' : 'Register New Patient'}
                                    </button>
                                </div>
                            </div>
                            {isRegistering && <RegisterPatientForm onRegister={handleRegisterPatient} />}
                            <div className="patient-list">
                                {isLoading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <div className="spinner"></div>
                                        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading patients...</p>
                                    </div>
                                ) : patients.length > 0 ? (
                                    patients.map(patient => (
                                        <div key={patient._id} className="patient-item">
                                            <div>
                                                <p><strong>{patient.name}</strong> ({patient.pid})</p>
                                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{patient.email}</p>
                                            </div>
                                            <button onClick={() => handleViewPatient(patient)} className="nav-button" style={{ padding: '0.5rem 1rem' }}>View Dashboard</button>
                                        </div>
                                    ))
                                ) : (
                                    <p>No patients registered yet. Use the button above to add one.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </main>
    );
};

const GraphologistDashboard = ({ currentUser }) => {
    const [samples, setSamples] = useState([]);
    const [selectedSample, setSelectedSample] = useState(null);
    const [formData, setFormData] = useState({
        wordSpacing: '',
        pressure: '',
        qualitativeAnalysis: '',
        aiAgreement: ''
    });

    useEffect(() => {
        const fetchSamples = async () => {
            try {
                const token = localStorage.getItem('userToken');
                const res = await fetch('http://localhost:5001/api/graphologist/pending-samples', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) setSamples(data);
            } catch (err) {
                console.error('Error fetching samples:', err);
            }
        };
        fetchSamples();
    }, []);

    const handleSelectSample = (sample) => {
        setSelectedSample(sample);
        setFormData({
            wordSpacing: '',
            pressure: '',
            qualitativeAnalysis: '',
            aiAgreement: ''
        });
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('userToken');
            const res = await fetch('http://localhost:5001/api/graphologist/submit-review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sampleId: selectedSample._id,
                    ...formData,
                    reviewedBy: currentUser._id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to submit review');
            setSamples(samples.filter(sample => sample._id !== selectedSample._id));
            setSelectedSample(null);
            alert('Review submitted successfully!');
        } catch (err) {
            alert('Error submitting review: ' + err.message);
        }
    };

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="page-banner">
                <h2>Graphologist Dashboard</h2>
                <p>Review and analyze pending handwriting samples</p>
            </div>

            <div className="dashboard-summary-cards">
                <div className="summary-card">
                    <h4>Total Pending Samples</h4>
                    <p className="summary-number">{samples.length}</p>
                </div>
                <div className="summary-card">
                    <h4>Samples Reviewed Today</h4>
                    <p className="summary-number">0</p> {/* Placeholder */}
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="card full-width">
                    <h3>Pending Reviews</h3>
                    {samples.length > 0 ? (
                        <div className="pending-samples-list">
                            {samples.map(sample => (
                                <div key={sample._id} className="pending-sample-item">
                                    <div className="sample-info">
                                        <p><strong>Patient ID:</strong> {sample.patientPID}</p>
                                        <p><strong>Date:</strong> {new Date(sample.date).toLocaleDateString()}</p>
                                        <p><strong>AI Prediction:</strong> <span className={`prediction-${sample.aiPrediction.toLowerCase()}`}>{sample.aiPrediction}</span></p>
                                    </div>
                                    <button onClick={() => handleSelectSample(sample)} className="nav-button">Review</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No pending samples to review. Great job!</p>
                    )}
                </div>

                {selectedSample && (
                    <div className="card full-width">
                        <h3>Sample Analysis - Patient {selectedSample.patientPID}</h3>
                        <div className="image-and-form-container">
                            <div className="sample-image-container">
                                <h4>Handwriting Sample</h4>
                                <img
                                    src={selectedSample.imageUrl}
                                    alt="Handwriting Sample"
                                    className="sample-image"
                                    onError={(e) => {
                                        console.error('Image failed to load:', selectedSample.imageUrl);
                                        e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                                    }}
                                />
                            </div>
                            <form onSubmit={handleReviewSubmit} className="review-form">
                                <div className="form-group">
                                    <label>Word Spacing</label>
                                    <input type="text" name="wordSpacing" value={formData.wordSpacing} onChange={(e) => setFormData(prev => ({ ...prev, wordSpacing: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Pressure</label>
                                    <input type="text" name="pressure" value={formData.pressure} onChange={(e) => setFormData(prev => ({ ...prev, pressure: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Qualitative Analysis</label>
                                    <textarea name="qualitativeAnalysis" value={formData.qualitativeAnalysis} onChange={(e) => setFormData(prev => ({ ...prev, qualitativeAnalysis: e.target.value }))} rows="4" required />
                                </div>
                                <div className="form-group">
                                    <label>AI Prediction Agreement</label>
                                    <select name="aiAgreement" value={formData.aiAgreement} onChange={(e) => setFormData(prev => ({ ...prev, aiAgreement: e.target.value }))} required >
                                        <option value="">Select</option>
                                        <option value="Agree">Agree</option>
                                        <option value="Disagree">Disagree</option>
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="button" onClick={() => setSelectedSample(null)} className="nav-button secondary">Cancel</button>
                                    <button type="submit" className="nav-button">Submit Review</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

const ResearcherDashboard = ({ currentUser }) => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('userToken');
                const res = await fetch('http://localhost:5001/api/researcher/statistics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) setStats(data);
            } catch (err) {
                console.error('Error fetching stats:', err);
            }
        };
        fetchStats();
    }, []);

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('userToken');
            const res = await fetch('http://localhost:5001/api/researcher/export', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'analysis_data.csv';
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Error exporting data: ' + err.message);
        }
    };

    if (!stats) return <p>Loading statistics...</p>;

    const reviewComparisonData = stats.reviewComparison || [
        { scenario: 'AI & Graphologist both predicted Recovery', count: 0 },
        { scenario: 'AI & Graphologist both predicted Relapse', count: 0 },
        { scenario: 'AI predicted Recovery, Graphologist Disagreed', count: 0 },
        { scenario: 'AI predicted Relapse, Graphologist Disagreed', count: 0 },
        { scenario: 'AI Predictions (No Human Review Yet)', count: 0 },
    ];


    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="page-banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Researcher Dashboard</h2>
                        <p>Analyze aggregated and anonymized data</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={async () => {
                                // Debug age data
                                try {
                                    const token = localStorage.getItem('userToken');
                                    const res = await fetch('http://localhost:5001/api/researcher/debug', {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    const data = await res.json();
                                    console.log('Debug Data:', data);
                                    alert(`Debug data logged to console. Found ${data.length} records. Check browser console for details.`);
                                } catch (err) {
                                    console.error('Error fetching debug data:', err);
                                }
                            }}
                            className="nav-button"
                            style={{ backgroundColor: '#f59e0b', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                            Debug Ages
                        </button>
                        <button
                            onClick={() => {
                                // Refresh statistics
                                const fetchStats = async () => {
                                    try {
                                        const token = localStorage.getItem('userToken');
                                        const res = await fetch('http://localhost:5001/api/researcher/statistics', {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        const data = await res.json();
                                        if (res.ok) setStats(data);
                                    } catch (err) {
                                        console.error('Error fetching stats:', err);
                                    }
                                };
                                fetchStats();
                            }}
                            className="nav-button"
                            style={{ backgroundColor: '#6b7280', padding: '0.5rem 1rem' }}
                        >
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-summary-cards">
                <div className="summary-card">
                    <h4>Total Analyses</h4>
                    <p className="summary-number">{stats.totalAnalyses}</p>
                </div>
                <div className="summary-card">
                    <h4>Recovery Rate</h4>
                    <p className="summary-number">{stats.recoveryRate}%</p>
                </div>
                <div className="summary-card">
                    <h4>Relapse Risk Rate</h4>
                    <p className="summary-number">{stats.relapseRiskRate}%</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="card full-width">
                    <h3>Age Group Analysis</h3>
                    <table className="researcher-table">
                        <thead>
                            <tr>
                                <th>Age Group</th>
                                <th>Recovery Cases</th>
                                <th>Relapse Cases</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.ageGroups.map((group, index) => (
                                <tr key={index}>
                                    <td>{group.range}</td>
                                    <td>{group.recovery}</td>
                                    <td>{group.relapse}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card full-width">
                    <h3>AI vs. Human Review</h3>
                    <table className="researcher-table">
                        <thead>
                            <tr>
                                <th>Comparison Scenario</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviewComparisonData.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.scenario}</td>
                                    <td>{item.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card full-width">
                    <h3>Feature Correlations</h3>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                        Correlation strength between handwriting features and prediction outcomes.
                        Higher values (closer to 1.0) indicate stronger predictive power.
                        <br />
                        <strong>Scale:</strong> 0.0-0.3 (Weak) | 0.3-0.7 (Moderate) | 0.7-1.0 (Strong)
                    </p>
                    <div className="feature-list researcher">
                        {stats.featureCorrelations.map((corr, index) => (
                            <div key={index} className="feature-item">
                                <span className="feature-label">{corr.feature}</span>
                                <span className="feature-value" style={{
                                    color: corr.correlation === 'N/A' ? '#6b7280' :
                                        parseFloat(corr.correlation) >= 0.7 ? '#16a34a' :
                                            parseFloat(corr.correlation) >= 0.3 ? '#f59e0b' : '#dc2626'
                                }}>
                                    {corr.correlation}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleExport} className="nav-button" style={{ marginTop: '1rem', width: 'auto' }}>
                        Export Data as CSV
                    </button>
                </div>
            </div>
        </main>
    );
};

const PatientDashboard = ({ currentUser }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('userToken');
                const res = await fetch(`http://localhost:5001/api/history/${currentUser._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch history');
                const data = await res.json();
                setHistory(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [currentUser]);

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="page-banner">
                <h2>Welcome, {currentUser?.name || currentUser?.email}!</h2>
                <p>Your counselor will upload and manage your handwriting analysis for you. You can view your results and history here.</p>
            </div>
            <div className="card full-width" style={{ marginTop: '2rem' }}>
                <h3>My Analysis History</h3>
                {isLoading && <p>Loading history...</p>}
                {error && <p className="auth-error">{error}</p>}
                {!isLoading && !error && (
                    <HistoryPage currentUser={currentUser} history={history} />
                )}
            </div>
        </main>
    );
};

const HistoryPage = ({ currentUser, history, setHistory }) => {
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [localHistory, setLocalHistory] = useState(history || []);

    // Function to fetch history
    const fetchHistory = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('userToken');
            let endpoint = '';

            // Different endpoints for different user types
            switch (currentUser.userType) {
                case 'Patient':
                    endpoint = `http://localhost:5001/api/history/${currentUser._id}`;
                    break;
                case 'Counselor':
                    endpoint = `http://localhost:5001/api/counselor/all-analyses`;
                    break;
                case 'Researcher':
                    endpoint = `http://localhost:5001/api/researcher/all-analyses`;
                    break;
                default:
                    endpoint = `http://localhost:5001/api/history/${currentUser._id}`;
            }

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch history');

            const data = await res.json();
            setLocalHistory(data);

            // Update parent state if setHistory is provided
            if (setHistory) {
                setHistory(data);
            }

        } catch (err) {
            setError(err.message);
            console.error('Error fetching history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch history when component mounts or when currentUser changes
    useEffect(() => {
        fetchHistory();
    }, [currentUser]);

    // Enhanced history display with better formatting and more information
    const formatHistoryItem = (analysis) => {
        const date = new Date(analysis.date).toLocaleString();
        const outcome = analysis.combinedOutcome || analysis.imageAnalysis?.outcome || 'Unknown';
        const confidence = analysis.imageAnalysis?.confidence;

        return (
            <div key={analysis.id || analysis._id} style={{
                borderBottom: '1px solid #e5e7eb',
                padding: '1.5rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background-color 0.2s ease'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                            <strong>Date:</strong> {date}
                        </p>
                        {confidence && (
                            <span style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                backgroundColor: '#f3f4f6',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.375rem'
                            }}>
                                Confidence: {confidence}%
                            </span>
                        )}
                    </div>

                    {/* Show patient info for counselors and researchers */}
                    {(currentUser.userType === 'Counselor' || currentUser.userType === 'Researcher') && (
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                            <strong>Patient:</strong> {
                                analysis.patientId?.name ||
                                analysis.patientPID ||
                                analysis.anonymousPatientId ||
                                'Unknown'
                            }
                        </p>
                    )}

                    <p style={{ margin: 0, fontSize: '1rem' }}>
                        <strong>Result:</strong>
                        <span style={{
                            color: outcome === 'Recovery' ? '#16a34a' : '#dc2626',
                            fontWeight: '600',
                            marginLeft: '0.5rem'
                        }}>
                            {outcome}
                        </span>
                    </p>
                    {analysis.questionnaireAnalysis && (
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                            Questionnaire Score: {analysis.questionnaireAnalysis.score}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setSelectedAnalysis(analysis)}
                    className="nav-button"
                    style={{ padding: '0.5rem 1rem', minWidth: '120px' }}
                >
                    View Details
                </button>
            </div>
        );
    };

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="page-banner">
                <h2>Analysis History</h2>
                <p>View all previous handwriting analyses and their detailed results</p>
            </div>

            {isLoading && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading history...</p>
                </div>
            )}

            {error && (
                <div className="card">
                    <p className="auth-error">{error}</p>
                </div>
            )}

            {selectedAnalysis ? (
                <>
                    <button
                        onClick={() => setSelectedAnalysis(null)}
                        className="nav-button"
                        style={{ marginBottom: '1.5rem', backgroundColor: '#6b7280' }}
                    >
                        ← Back to History
                    </button>
                    <div className="card">
                        <DetailedResults analysisResult={selectedAnalysis} isHistoryView={true} />
                    </div>
                </>
            ) : (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>
                            {currentUser.userType === 'Patient' ? 'My Analysis History' : 'Analysis History'}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                backgroundColor: '#f3f4f6',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem'
                            }}>
                                Total Records: {localHistory?.length || 0}
                            </span>
                            <button
                                onClick={fetchHistory}
                                className="nav-button"
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#6b7280'
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {!isLoading && !error && (
                        <>
                            {localHistory && localHistory.length > 0 ? (
                                <div style={{ marginTop: '1rem' }}>
                                    {localHistory.map(formatHistoryItem)}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No analysis history found</p>
                                    <p style={{ fontSize: '0.875rem' }}>
                                        {currentUser.userType === 'Patient'
                                            ? 'Your counselor will upload your first analysis.'
                                            : 'No analyses have been completed yet.'}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </main>
    );
};

// Enhanced component for Graphologist History
const GraphologistHistory = ({ currentUser }) => {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReviews = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('userToken');
            const res = await fetch(`http://localhost:5001/api/graphologist/reviews/${currentUser._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch reviews');
            const data = await res.json();
            setReviews(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [currentUser]);

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="page-banner">
                <h2>My Review History</h2>
                <p>View all handwriting samples you have reviewed and analyzed</p>
            </div>

            {isLoading && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading reviews...</p>
                </div>
            )}

            {error && (
                <div className="card">
                    <p className="auth-error">{error}</p>
                </div>
            )}

            {!isLoading && !error && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Review History</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                backgroundColor: '#f3f4f6',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem'
                            }}>
                                Total Reviews: {reviews.length}
                            </span>
                            <button
                                onClick={fetchReviews}
                                className="nav-button"
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#6b7280'
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        {reviews.length > 0 ? (
                            reviews.map((review) => (
                                <div key={review._id} style={{
                                    borderBottom: '1px solid #e5e7eb',
                                    padding: '1.5rem 0',
                                    transition: 'background-color 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                                                <strong>Patient ID:</strong> {review.patientPID}
                                            </p>
                                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                                                <strong>Review Date:</strong> {new Date(review.graphologistReview.reviewDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                                                <strong>AI Prediction:</strong>
                                                <span style={{
                                                    color: review.aiPrediction === 'Recovery' ? '#16a34a' : '#dc2626',
                                                    fontWeight: '600',
                                                    marginLeft: '0.5rem'
                                                }}>
                                                    {review.aiPrediction}
                                                </span>
                                            </p>
                                            <p style={{ margin: 0, fontSize: '1rem' }}>
                                                <strong>My Agreement:</strong>
                                                <span style={{
                                                    color: review.graphologistReview.aiAgreement === 'Agree' ? '#16a34a' : '#dc2626',
                                                    fontWeight: '600',
                                                    marginLeft: '0.5rem'
                                                }}>
                                                    {review.graphologistReview.aiAgreement}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{
                                        backgroundColor: '#f9fafb',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        borderLeft: '4px solid #3b82f6'
                                    }}>
                                        <p style={{ margin: 0, fontStyle: 'italic', color: '#374151' }}>
                                            <strong>Analysis:</strong> "{review.graphologistReview.qualitativeAnalysis}"
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No reviews submitted yet</p>
                                <p style={{ fontSize: '0.875rem' }}>
                                    Start reviewing handwriting samples to build your history.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
};


const ProfilePage = ({ currentUser, setCurrentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    if (!currentUser) {
        return <p>Loading profile...</p>;
    }

    const calculateAge = (dob) => {
        if (!dob) return "Not provided";
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleSaveProfile = (updatedUser) => {
        setCurrentUser({ ...updatedUser, pid: currentUser.pid });
        setIsModalOpen(false);
        alert("Profile updated successfully!");
    };

    const memberSince = new Date(currentUser.registrationDate).toLocaleDateString();
    const age = calculateAge(currentUser.dob);

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            {isModalOpen && (
                <EditProfileModal
                    currentUser={currentUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveProfile}
                />
            )}
            {showDisclaimer && (
                <DisclaimerModal
                    onAccept={() => setShowDisclaimer(false)}
                    onDecline={() => setShowDisclaimer(false)}
                    isManualView={true}
                />
            )}
            <div className="page-banner">
                <h2>User Profile</h2>
            </div>
            <div className="card">
                {currentUser.userType === 'Patient' && <p><strong>Patient ID:</strong> {currentUser.pid}</p>}
                <p><strong>Name:</strong> {currentUser.name || 'Not provided'}</p>
                <p><strong>Email:</strong> {currentUser.email}</p>
                <p><strong>Phone:</strong> {currentUser.phone}</p>
                <p><strong>Date of Birth:</strong> {currentUser.dob ? new Date(currentUser.dob).toLocaleDateString() : 'Not provided'}</p>
                <p><strong>Age:</strong> {age}</p>
                <p><strong>User Type:</strong> {currentUser.userType}</p>
                <p><strong>Member Since:</strong> {memberSince}</p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <button
                        className="nav-button"
                        onClick={() => setIsModalOpen(true)}
                    >
                        Edit Profile
                    </button>
                    <button
                        className="nav-button"
                        style={{ backgroundColor: '#6b7280' }}
                        onClick={() => setShowDisclaimer(true)}
                    >
                        View Disclaimer
                    </button>
                </div>
            </div>
        </main>
    );
};

export default function App() {
    const [page, setPage] = useState('home');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
    const [isFirstLogin, setIsFirstLogin] = useState(false);
    const [history, setHistory] = useState([]);
    const [preselectedRole, setPreselectedRole] = useState(null);

    const handleSetPage = (pageName, role = null) => {
        if (role) {
            setPreselectedRole(role);
        } else {
            setPreselectedRole(null);
        }
        setPage(pageName);
        // Save current page to localStorage for persistence across refreshes
        if (isLoggedIn) {
            localStorage.setItem('currentPage', pageName);
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            handleSetPage('reset-password');
        } else {
            const savedToken = localStorage.getItem('userToken');
            if (savedToken) {
                const fetchUser = async () => {
                    try {
                        const res = await fetch('http://localhost:5001/api/get-user', {
                            headers: { 'Authorization': `Bearer ${savedToken}` }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            const userWithPID = {
                                ...data.user,
                                pid: generatePID(data.user._id)
                            };
                            setCurrentUser(userWithPID);
                            setIsLoggedIn(true);

                            // Fetch history for all roles on login
                            const historyRes = await fetch(`http://localhost:5001/api/history/${userWithPID._id}`, {
                                headers: { 'Authorization': `Bearer ${savedToken}` }
                            });
                            const historyData = await historyRes.json();
                            if (historyRes.ok) {
                                setHistory(historyData);
                            }

                            // Restore the last page or default to dashboard
                            const lastPage = localStorage.getItem('currentPage') || 'dashboard';
                            handleSetPage(lastPage);
                        } else {
                            localStorage.clear();
                        }
                    } catch (error) {
                        console.error("Session restoration failed", error);
                        localStorage.clear();
                    }
                };
                fetchUser();
            }
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn && currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (isFirstLogin) {
                setShowDisclaimerModal(true);
                setIsFirstLogin(false);
            }
        } else {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userToken');
        }
    }, [isLoggedIn, currentUser, isFirstLogin]);

    const handleAcceptDisclaimer = async () => {
        try {
            const token = localStorage.getItem('userToken');
            const res = await fetch('http://localhost:5001/api/accept-disclaimer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to accept disclaimer');
            }

            setShowDisclaimerModal(false);
            handleSetPage('dashboard');
        } catch (error) {
            console.error('Error accepting disclaimer:', error);
            alert('Error accepting disclaimer. Please try again.');
        }
    };

    const handleDeclineDisclaimer = () => {
        setShowDisclaimerModal(false);
        setIsLoggedIn(false);
        setCurrentUser(null);
        handleSetPage('home');
    };

    const renderPage = () => {
        if (showDisclaimerModal) {
            return <DisclaimerModal onAccept={handleAcceptDisclaimer} onDecline={handleDeclineDisclaimer} />;
        }
        if (page === 'reset-password') {
            return <ResetPasswordPage setPage={handleSetPage} />;
        }
        if (!isLoggedIn) {
            switch (page) {
                case 'home':
                case 'about':
                    return <HomePage setPage={handleSetPage} />;
                case 'auth':
                    return <AuthPage setPage={handleSetPage} setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} setIsFirstLogin={setIsFirstLogin} role={preselectedRole} />;
                default:
                    return <HomePage setPage={handleSetPage} />;
            }
        } else {
            // Updated logic to handle all roles for History and Profile
            switch (page) {
                case 'profile':
                    return <ProfilePage currentUser={currentUser} setCurrentUser={setCurrentUser} />;
                case 'history':
                    if (currentUser.userType === 'Graphologist') {
                        return <GraphologistHistory currentUser={currentUser} />;
                    }
                    return <HistoryPage currentUser={currentUser} history={history} setHistory={setHistory} />;
                case 'dashboard':
                default:
                    switch (currentUser.userType) {
                        case 'Counselor':
                            return <CounselorDashboard currentUser={currentUser} />;
                        case 'Graphologist':
                            return <GraphologistDashboard currentUser={currentUser} />;
                        case 'Researcher':
                            return <ResearcherDashboard currentUser={currentUser} />;
                        case 'Patient':
                            return <PatientDashboard currentUser={currentUser} />;
                        default:
                            return <div className="container"><h2>Invalid User Role</h2><p>Your user role is not recognized.</p></div>;
                    }
            }
        }
    };

    return (
        <div className="app-container">
            <Header setPage={handleSetPage} isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} />
            <div className="app-content">
                {renderPage()}
            </div>
            <Footer />
        </div>
    );
}


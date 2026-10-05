import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Send,
  AlertTriangle,
  Award,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { usePapers } from '../../context/PaperContext';
import { useAuth } from '../../context/AuthContext';

const StudentExam = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { paperSets, submitStudentExam } = usePapers();
  const { user } = useAuth();

  const paper = paperSets[setId] || paperSets.SET_A;
  const questions = paper?.questions || [];

  // Question state management
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIdx]: 'A' | 'B' | 'C' | 'D' }
  const [reviewed, setReviewed] = useState({}); // { [questionIdx]: boolean }
  const [visited, setVisited] = useState({ 0: true }); // { [questionIdx]: boolean }

  // Modals & Submission state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examResult, setExamResult] = useState(null);

  // Timer setup (parse duration like "30 Minutes" -> 30 * 60 = 1800 seconds)
  const parseDurationInSeconds = (durationStr) => {
    if (!durationStr) return 1800;
    const match = durationStr.match(/\d+/);
    return match ? parseInt(match[0], 10) * 60 : 1800;
  };

  const initialSeconds = parseDurationInSeconds(paper?.duration);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const timerRef = useRef(null);

  // Evaluation and submission calculation
  const calculateResults = useCallback(() => {
    let score = 0;
    let correctCount = 0;
    let totalMarks = 0;

    questions.forEach((q, idx) => {
      const qMarks = q.marks || 2;
      totalMarks += qMarks;
      if (answers[idx] === q.correctAnswer) {
        score += qMarks;
        correctCount += 1;
      }
    });

    const percentage = Math.round((score / (totalMarks || 1)) * 100);
    const answeredCount = Object.keys(answers).length;
    const timeSpentSeconds = initialSeconds - timeLeft;
    const timeSpentStr = `${Math.floor(timeSpentSeconds / 60)}m ${timeSpentSeconds % 60}s`;

    return {
      studentUsername: user?.username || 'student',
      studentName: user?.name || 'Student Demo',
      setId: setId || 'SET_A',
      examName: paper.examName,
      subject: paper.subject,
      paperSet: paper.paperSet,
      totalQuestions: questions.length,
      answeredCount,
      correctCount,
      score,
      totalMarks,
      percentage,
      status: 'Completed',
      timeSpent: timeSpentStr,
      answers,
    };
  }, [answers, initialSeconds, paper.examName, paper.paperSet, paper.subject, questions, setId, timeLeft, user?.name, user?.username]);

  const executeSubmission = useCallback(() => {
    clearInterval(timerRef.current);
    const resultRecord = calculateResults();
    submitStudentExam(resultRecord);
    setExamResult(resultRecord);
    setIsSubmitted(true);
    setShowSubmitModal(false);
    setShowTimeUpModal(false);
  }, [calculateResults, submitStudentExam]);

  const handleTimeExpired = useCallback(() => {
    setShowTimeUpModal(true);
    setTimeout(() => {
      executeSubmission();
    }, 2000);
  }, [executeSubmission]);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isSubmitted, handleTimeExpired]);

  // Mark current as visited whenever currentIdx changes
  useEffect(() => {
    setVisited((prev) => ({ ...prev, [currentIdx]: true }));
  }, [currentIdx]);
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQ = questions[currentIdx] || {};

  // Actions
  const handleSelectOption = (optionKey) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: optionKey,
    }));
  };

  const handleClearResponse = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentIdx];
      return next;
    });
  };

  const handleToggleReview = () => {
    setReviewed((prev) => ({
      ...prev,
      [currentIdx]: !prev[currentIdx],
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleMarkAndNext = () => {
    setReviewed((prev) => ({ ...prev, [currentIdx]: true }));
    handleNext();
  };


  // Status determination for question palette
  const getQuestionStatus = (idx) => {
    const isAnswered = answers[idx] !== undefined;
    const isMarked = reviewed[idx];
    const isVisited = visited[idx];

    if (isMarked) return 'review';
    if (isAnswered) return 'answered';
    if (isVisited) return 'visited';
    return 'unvisited';
  };

  const totalAnswered = Object.keys(answers).length;
  const totalReviewed = Object.values(reviewed).filter(Boolean).length;
  const totalUnvisited = questions.length - Object.keys(visited).length;
  const totalVisitedNoAns = Object.keys(visited).length - totalAnswered;

  // TIMER WARNING STYLES
  const isTimeCritical = timeLeft < 120; // less than 2 mins
  const isTimeWarning = timeLeft < 300 && !isTimeCritical; // less than 5 mins

  // --- RESULT SCORECARD VIEW ---
  if (isSubmitted && examResult) {
    const isPass = examResult.percentage >= 40;

    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 animate-fade-in text-slate-800">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 text-center relative overflow-hidden">
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-4 ${
                isPass
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}
            >
              {isPass ? <Award className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Examination Completed & Evaluated
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 mb-2">
              {examResult.examName}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Paper Set: <span className="font-semibold text-slate-800">{examResult.paperSet}</span> &middot; Candidate: <span className="font-semibold text-slate-800">{examResult.studentName}</span>
            </p>

            {/* Score Ring / Bar */}
            <div className="max-w-md mx-auto grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Score</span>
                <span className="text-2xl font-black text-blue-700">
                  {examResult.score} <span className="text-xs font-normal text-slate-500">/ {examResult.totalMarks}</span>
                </span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Percentage</span>
                <span className="text-2xl font-black text-slate-900">
                  {examResult.percentage}%
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Grade Status</span>
                <span className={`text-base font-extrabold block mt-1 ${isPass ? 'text-emerald-700' : 'text-red-600'}`}>
                  {isPass ? 'PASSED (A)' : 'FAILED'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate('/student/results')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                View in Academic Results
              </button>
              <button
                onClick={() => navigate('/student')}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Performance Review & Answer Key
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Review your submitted responses alongside certified institutional solutions
            </p>

            <div className="space-y-4">
              {questions.map((q, idx) => {
                const userAns = answers[idx];
                const isCorrect = userAns === q.correctAnswer;
                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-2xl border transition-colors ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {q.questionText}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isCorrect ? `+${q.marks} Marks` : '0 Marks'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-3">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const optText = q[`option${opt}`];
                        const isStudentChoice = userAns === opt;
                        const isRightChoice = q.correctAnswer === opt;

                        let style = 'bg-slate-50 border-slate-200 text-slate-600';
                        if (isRightChoice) {
                          style = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                        } else if (isStudentChoice && !isRightChoice) {
                          style = 'bg-rose-50 border-rose-400 text-rose-900 line-through';
                        }

                        return (
                          <div key={opt} className={`p-2 rounded-xl border text-[11px] ${style}`}>
                            <strong>{opt}:</strong> {optText}
                            {isStudentChoice && (
                              <span className="block text-[10px] text-slate-500 font-normal">
                                (Your choice)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DISTRACTION-FREE EXAM PORTAL VIEW ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* High-Security CBT Portal Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Exam & Candidate Info */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md">
                  {paper.examName}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-400/30">
                  {paper.paperSet}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Candidate: <span className="text-slate-200 font-semibold">{user?.name}</span> &middot; Roll: <span className="font-mono text-slate-300">2026-CS-401</span>
              </p>
            </div>
          </div>

          {/* Central Live Timer */}
          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-mono text-sm sm:text-base font-black transition-all ${
                isTimeCritical
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 timer-critical-pulse'
                  : isTimeWarning
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-emerald-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(timeLeft)}</span>
            </div>

            {/* Quick Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Submit Examination</span>
              <span className="sm:hidden">Submit</span>
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(totalAnswered / (questions.length || 1)) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Examination View: Split Screen */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Left Side: Question Canvas */}
        <div className="flex-1 flex flex-col justify-between bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
          <div>
            {/* Question Header & Meta */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 font-mono">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Multiple Choice Question
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  +{currentQ.marks || 2} Marks
                </span>
                <span className="text-xs font-medium text-slate-400">
                  0 Negative
                </span>
              </div>
            </div>

            {/* Question Statement */}
            <div className="mb-8">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {currentQ.questionText}
              </h2>
            </div>

            {/* MCQ Options List */}
            <div className="space-y-3">
              {[
                { key: 'A', text: currentQ.optionA },
                { key: 'B', text: currentQ.optionB },
                { key: 'C', text: currentQ.optionC },
                { key: 'D', text: currentQ.optionD },
              ].map(({ key, text }) => {
                const isSelected = answers[currentIdx] === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectOption(key)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between group ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-semibold shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                        }`}
                      >
                        {key}
                      </span>
                      <span className="text-sm">{text}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Footer Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIdx === 0}
                className="px-3.5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleClearResponse}
                disabled={answers[currentIdx] === undefined}
                className="px-3.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Response</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleReview}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                  reviewed[currentIdx]
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-600" />
                <span>{reviewed[currentIdx] ? 'Unmark Review' : 'Mark for Review'}</span>
              </button>

              <button
                type="button"
                onClick={handleMarkAndNext}
                className="px-3.5 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 hidden sm:flex"
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-600" />
                <span>Mark & Next</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIdx === questions.length - 1}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Save & Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Question Navigator Palette */}
        <div className="w-full lg:w-80 flex flex-col justify-between bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Question Palette
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                {totalAnswered}/{questions.length} Answered
              </span>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                <span className="text-slate-700 font-medium">Answered ({totalAnswered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-purple-500 shrink-0" />
                <span className="text-slate-700 font-medium">Marked ({totalReviewed})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
                <span className="text-slate-700 font-medium">Not Answered ({totalVisitedNoAns})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-200 shrink-0" />
                <span className="text-slate-700 font-medium">Not Visited ({totalUnvisited})</span>
              </div>
            </div>

            {/* Question Buttons Matrix */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, idx) => {
                const status = getQuestionStatus(idx);
                const isCurrent = currentIdx === idx;

                let btnStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                if (status === 'answered') {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs';
                } else if (status === 'review') {
                  btnStyle = 'bg-purple-600 text-white border-purple-600 shadow-2xs';
                } else if (status === 'visited') {
                  btnStyle = 'bg-amber-100 text-amber-900 border-amber-300';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-xl font-bold text-xs border transition-all flex items-center justify-center relative ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                    }`}
                  >
                    {idx + 1}
                    {reviewed[idx] && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Finish & Submit Trigger */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Final Examination Submission</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Instant evaluation & grading on submission
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 max-w-md w-full animate-modal-pop">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-4">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Confirm Exam Submission
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Review your progress summary before finalizing. Once submitted, your exam responses will be graded and logged permanently.
            </p>

            {/* Summary Chips */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Answered</span>
                <span className="text-base font-black text-emerald-700">{totalAnswered} / {questions.length}</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Marked for Review</span>
                <span className="text-base font-black text-purple-700">{totalReviewed}</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Unanswered</span>
                <span className="text-base font-black text-amber-700">{questions.length - totalAnswered}</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Remaining</span>
                <span className="text-base font-black text-blue-700">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={executeSubmission}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Submit Modal on Time-Up */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-sm w-full text-center animate-modal-pop">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Time Expired!
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              Your allotted test duration has elapsed. Submitting responses and evaluating answers now...
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 animate-pulse w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExam;

import React, { useEffect, useRef, useState } from 'react';
import { Brain, FileText, Mic, Square, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../context/workspace';
import { API_BASE_URL, apiFetch } from '../lib/api';

const VOICE_OPTIONS = [
  {
    id: 'mentor',
    label: 'Emma',
    match: /aria|jenny|samantha|karen|natural|neural/i,
    rate: 0.88,
    pitch: 1,
  },
  {
    id: 'friendly',
    label: 'Noah',
    match: /jenny|zira|google us english|susan|heera/i,
    rate: 0.92,
    pitch: 1.04,
  },
  {
    id: 'lead',
    label: 'Sophia',
    match: /guy|david|mark|daniel|alex/i,
    rate: 0.9,
    pitch: 0.96,
  },
  {
    id: 'coach',
    label: 'Liam',
    match: /zira|jenny|aria|google uk english female/i,
    rate: 0.98,
    pitch: 1.08,
  },
  {
    id: 'clear',
    label: 'Olivia',
    match: /google|microsoft|natural|neural/i,
    rate: 0.9,
    pitch: 1,
  },
] as const;

type VoiceOptionId = typeof VOICE_OPTIONS[number]['id'];

type Profile = {
  candidateTitle?: string;
  targetRole?: string;
  experienceLevel?: string;
  summary?: string;
  skills?: string[];
  projects?: string[];
  strengths?: string[];
  gaps?: string[];
  recommendedFocus?: string[];
};

type Question = {
  id: string;
  type: string;
  question: string;
  expectedSignals?: string[];
};

type Feedback = {
  score?: number;
  clarity?: number;
  technicalDepth?: number;
  confidence?: number;
  feedback?: string;
  missingPoints?: string[];
  suggestedAnswer?: string;
};

type Report = {
  overallScore?: number;
  hireReadiness?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  communicationFeedback?: string;
  technicalFeedback?: string;
  learningRoadmap?: string[];
  nextInterviewFocus?: string[];
};

const MockInterview: React.FC = () => {
  const { targetRole, setTargetRole } = useWorkspace();
  const [resume, setResume] = useState<File | null>(null);
  const [role, setRole] = useState(targetRole);
  const [stack, setStack] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState('standard');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [interviewTitle, setInterviewTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<string, Feedback>>({});
  const [report, setReport] = useState<Report | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceStyle, setSelectedVoiceStyle] = useState<VoiceOptionId>('mentor');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechStatus, setSpeechStatus] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef('');
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang.toLowerCase().startsWith('en'));

      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const requestJson = async <T,>(url: string, options: RequestInit): Promise<T> => {
    return apiFetch<T>(url, options);
  };

  const analyzeProfile = async () => {
    setError('');
    setReport(null);
    setQuestions([]);
    setFeedbackByQuestion({});

    if (!resume && !role.trim() && !stack.trim()) {
      setError('Upload a resume or enter a target role/tech stack.');
      return;
    }

    const formData = new FormData();
    if (resume) formData.append('resume', resume);
    formData.append('role', role);
    formData.append('stack', stack);

    setIsLoading(true);
    try {
      const data = await requestJson<{ profile: Profile }>(`${API_BASE_URL}/api/mock/analyze-profile`, {
        method: 'POST',
        body: formData,
      });
      setProfile(data.profile);
      if (!role && data.profile.targetRole) {
        setRole(data.profile.targetRole);
      }
      if (data.profile.targetRole || role) {
        setTargetRole(data.profile.targetRole || role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const startInterview = async () => {
    if (!profile) {
      setError('Analyze the resume or role before starting the interview.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const data = await requestJson<{
        sessionId: string;
        interviewTitle: string;
        questions: Question[];
      }>(`${API_BASE_URL}/api/mock/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, role, difficulty, duration }),
      });
      setSessionId(data.sessionId);
      setInterviewTitle(data.interviewTitle);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      speak(data.questions[0]?.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the mock interview.');
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text?: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const selectedStyle = VOICE_OPTIONS.find((option) => option.id === selectedVoiceStyle) || VOICE_OPTIONS[0];
    const selectedVoice =
      voices.find((voice) => selectedStyle.match.test(voice.name)) ||
      voices.find((voice) => /natural|neural|google|microsoft/i.test(voice.name)) ||
      voices[0];
    const conversationalText = `Here is your question. ${text}`;
    const utterance = new SpeechSynthesisUtterance(conversationalText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = selectedStyle.rate;
    utterance.pitch = selectedStyle.pitch;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const scoreAnswerTranscript = async (answerTranscript: string) => {
    if (!sessionId || !currentQuestion) return;

    const cleanedTranscript = answerTranscript.replace(/\s+/g, ' ').trim();
    if (!cleanedTranscript) {
      setError('Record your spoken answer before submitting.');
      return;
    }

    setError('');
    setSpeechStatus('Scoring your answer...');
    setIsLoading(true);
    try {
      const data = await requestJson<{ feedback: Feedback }>(`${API_BASE_URL}/api/mock/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          transcript: cleanedTranscript,
        }),
      });
      setFeedbackByQuestion((previous) => ({
        ...previous,
        [currentQuestion.id]: data.feedback,
      }));
      setSpeechStatus('Score ready.');
    } catch (err) {
      setSpeechStatus('');
      setError(err instanceof Error ? err.message : 'Could not score this answer.');
    } finally {
      setIsLoading(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!audioBlob.size) {
      setError('No audio was captured. Try recording again.');
      setSpeechStatus('');
      return;
    }

    const formData = new FormData();
    const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('audio', audioBlob, `interview-answer.${extension}`);

    setIsTranscribing(true);
    setSpeechStatus('Transcribing with Deepgram...');
    setInterimTranscript('Transcribing with Deepgram...');
    try {
      const data = await requestJson<{ transcript: string; confidence?: number }>(`${API_BASE_URL}/api/mock/transcribe`, {
        method: 'POST',
        body: formData,
      });
      const cleanedTranscript = data.transcript.replace(/\s+/g, ' ').trim();
      finalTranscriptRef.current = cleanedTranscript;
      setTranscript(cleanedTranscript);
      setInterimTranscript('');
      setSpeechStatus(`Transcript ready${data.confidence ? ` (${Math.round(data.confidence * 100)}% confidence)` : ''}.`);
      await scoreAnswerTranscript(cleanedTranscript);
    } catch (err) {
      setInterimTranscript('');
      setSpeechStatus('');
      setError(err instanceof Error ? err.message : 'Could not transcribe your recording.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopMediaStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startListening = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Microphone recording is not available in this browser. Use Chrome or Edge for voice answers.');
      return;
    }

    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stopMediaStream();
        setIsListening(false);
        void transcribeAudio(audioBlob);
      };
      recorder.onerror = () => {
        stopMediaStream();
        setIsListening(false);
        setError('Recording failed. Check microphone permission and try again.');
      };

      mediaRecorderRef.current = recorder;
      setTranscript('');
      finalTranscriptRef.current = '';
      setSpeechStatus('Recording...');
      setInterimTranscript('Recording...');
      recorder.start();
      setIsListening(true);
    } catch {
      stopMediaStream();
      setError('Microphone permission is blocked. Allow microphone access in the browser and try again.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setSpeechStatus('Preparing audio for Deepgram...');
      setInterimTranscript('Preparing audio for Deepgram...');
    }
  };

  const submitAnswer = async () => {
    if (!sessionId || !currentQuestion) return;
    if (isListening) {
      stopListening();
      setError('Transcribing your answer with Deepgram. Submit after the transcript appears.');
      return;
    }
    if (isTranscribing) {
      setError('Deepgram is still transcribing your answer. Submit after the transcript appears.');
      return;
    }

    await scoreAnswerTranscript(transcript);
  };

  const nextQuestion = () => {
    const nextIndex = Math.min(currentIndex + 1, questions.length - 1);
    setCurrentIndex(nextIndex);
    setTranscript('');
    setInterimTranscript('');
    setSpeechStatus('');
    finalTranscriptRef.current = '';
    speak(questions[nextIndex]?.question);
  };

  const finishInterview = async () => {
    setError('');
    setIsLoading(true);
    try {
      const data = await requestJson<{ report: Report }>(`${API_BASE_URL}/api/mock/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      setReport(data.report);
      window.speechSynthesis?.cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the final report.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentFeedback = currentQuestion ? feedbackByQuestion[currentQuestion.id] : undefined;
  const visibleTranscript = `${transcript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();

  return (
    <div className="tool-shell">
      <div className="tool-intro mb-8">
        <div>
        <p className="eyebrow-text text-sk-blue">Voice interview lab</p>
        <h1>Practice the answer, not just the question.</h1>
        <p>
          Share a resume or choose a role, pick an interviewer voice, and answer questions out loud. You will get
          focused coaching after each answer and a final readiness report at the end.
        </p>
        </div>
        <div className="tool-intro-note">
          <Mic className="h-5 w-5" />
          <span>Deepgram transcription with answer-by-answer coaching.</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="studio-panel p-6 lg:col-span-1">
          <div className="mb-5 flex items-center gap-3">
            <FileText className="h-7 w-7 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-600">Step 1</p>
              <h2 className="text-xl font-semibold">Tell us what to interview you for</h2>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-gray-700">Resume, optional</label>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(event) => setResume(event.target.files?.[0] || null)}
            className="mb-4 w-full rounded-md border border-gray-300 p-2"
          />

          <label className="mb-2 block text-sm font-medium text-gray-700">Target role</label>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Frontend Developer, Data Analyst..."
            className="mb-4 w-full rounded-md border border-gray-300 p-3"
          />

          <label className="mb-2 block text-sm font-medium text-gray-700">Tech stack or skills</label>
          <textarea
            value={stack}
            onChange={(event) => setStack(event.target.value)}
            placeholder="React, Python, Flask, SQL, Machine Learning..."
            className="mb-4 min-h-28 w-full rounded-md border border-gray-300 p-3"
          />

          <label className="mb-2 block text-sm font-medium text-gray-700">Choose interviewer</label>
          <select
            value={selectedVoiceStyle}
            onChange={(event) => setSelectedVoiceStyle(event.target.value as VoiceOptionId)}
            className="mb-5 w-full rounded-md border border-gray-300 p-3"
          >
            {VOICE_OPTIONS.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>

          <button
            onClick={analyzeProfile}
            disabled={isLoading}
            className="primary-button w-full disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? 'Preparing...' : 'Prepare my interview'}
          </button>
        </section>

        <section className="studio-panel p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <Brain className="h-7 w-7 text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-purple-600">Step 2</p>
              <h2 className="text-xl font-semibold">Review your interview plan</h2>
            </div>
          </div>

          {!profile ? (
            <div className="rounded-lg bg-gray-50 p-6 text-gray-600">
              Add a resume, role, or skills on the left. Your interview plan will appear here before the session starts.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{profile.candidateTitle || 'Candidate Profile'}</h3>
                <p className="mt-2 text-gray-600">{profile.summary}</p>
              </div>

              <InfoList title="Detected Skills" items={profile.skills} />
              <InfoList title="Strengths" items={profile.strengths} />
              <InfoList title="Skill Gaps" items={profile.gaps} />
              <InfoList title="Interview Focus" items={profile.recommendedFocus} />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Duration</label>
                  <select
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3"
                  >
                    <option value="short">Short, 5 questions</option>
                    <option value="standard">Standard, 7 questions</option>
                    <option value="deep">Deep, 10 questions</option>
                  </select>
                </div>
              </div>

              <button
                onClick={startInterview}
                disabled={isLoading}
                className="primary-button bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                Start mock interview
              </button>
            </div>
          )}
        </section>
      </div>

      {currentQuestion && !report && (
        <section className="studio-panel mt-8 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-600">{interviewTitle}</p>
              <h2 className="text-2xl font-bold">
                Question {currentIndex + 1} of {questions.length}
              </h2>
            </div>
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              {currentQuestion.type}
            </span>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
            <p className="text-xl font-semibold text-gray-900">{currentQuestion.question}</p>
            <button
              onClick={() => speak(currentQuestion.question)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-semibold text-blue-700 shadow-sm hover:bg-blue-100"
            >
              <Play className="h-4 w-4" />
              Replay question
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-5">
              <h3 className="mb-3 text-lg font-semibold">Answer out loud</h3>
              <p className="mb-4 text-sm text-gray-600">
                Press start, speak naturally, then stop when you are done. Deepgram will transcribe your recording and
                score it automatically.
              </p>
              {speechStatus && (
                <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                  {speechStatus}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={startListening}
                  disabled={isListening || isLoading || isTranscribing}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  <Mic className="h-5 w-5" />
                  Start speaking
                </button>
                <button
                  onClick={stopListening}
                  disabled={!isListening}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-700 px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:bg-gray-300"
                >
                  <Square className="h-5 w-5" />
                  Stop and transcribe
                </button>
              </div>
              <textarea
                value={transcript}
                onChange={(event) => {
                  finalTranscriptRef.current = event.target.value;
                  setTranscript(event.target.value);
                  setSpeechStatus(event.target.value.trim() ? 'Transcript edited.' : '');
                }}
                placeholder={interimTranscript || 'Your Deepgram transcript will appear here. You can also type or edit it before scoring.'}
                className="mt-4 min-h-32 w-full rounded-md border border-gray-200 bg-gray-100 p-4 text-gray-700"
              />
              <button
                onClick={() => {
                  finalTranscriptRef.current = '';
                  setTranscript('');
                  setInterimTranscript('');
                  setSpeechStatus('');
                }}
                className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Clear transcript
              </button>
              <button
                onClick={submitAnswer}
                disabled={isLoading || isListening || isTranscribing || !visibleTranscript}
                className="mt-4 rounded-md bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-green-300"
              >
                {isLoading ? 'Scoring...' : 'Score Answer'}
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 p-5">
              <h3 className="mb-3 text-lg font-semibold">AI Feedback</h3>
              {!currentFeedback ? (
                <p className="text-gray-600">Submit your spoken answer to receive score and coaching.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Score" value={currentFeedback.score} />
                    <Metric label="Clarity" value={currentFeedback.clarity} />
                    <Metric label="Depth" value={currentFeedback.technicalDepth} />
                    <Metric label="Confidence" value={currentFeedback.confidence} />
                  </div>
                  <p className="text-gray-700">{currentFeedback.feedback}</p>
                  <InfoList title="Missing Points" items={currentFeedback.missingPoints} />
                  {currentFeedback.suggestedAnswer && (
                    <div className="rounded-md bg-green-50 p-4">
                      <p className="font-semibold text-green-800">Suggested stronger answer</p>
                      <p className="mt-2 text-green-900">{currentFeedback.suggestedAnswer}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {currentIndex < questions.length - 1 ? (
                      <button
                        onClick={nextQuestion}
                        className="rounded-md bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        onClick={finishInterview}
                        disabled={isLoading}
                        className="rounded-md bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700 disabled:bg-purple-300"
                      >
                        Finish Interview
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {report && (
        <section className="studio-panel mt-8 p-6">
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-semibold uppercase text-green-600">Final Report</p>
              <h2 className="text-3xl font-bold">Overall Score: {report.overallScore ?? 'N/A'}/100</h2>
            </div>
          </div>
          <p className="mb-4 text-lg font-semibold text-blue-700">Hire readiness: {report.hireReadiness}</p>
          <p className="mb-6 text-gray-700">{report.summary}</p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <InfoList title="Strengths" items={report.strengths} />
            <InfoList title="Weaknesses" items={report.weaknesses} />
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900">Communication Feedback</h3>
              <p className="mt-2 text-blue-900">{report.communicationFeedback}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <h3 className="font-semibold text-purple-900">Technical Feedback</h3>
              <p className="mt-2 text-purple-900">{report.technicalFeedback}</p>
            </div>
            <InfoList title="Learning Roadmap" items={report.learningRoadmap} />
            <InfoList title="Next Interview Focus" items={report.nextInterviewFocus} />
          </div>
        </section>
      )}
    </div>
  );
};

const InfoList: React.FC<{ title: string; items?: string[] }> = ({ title, items }) => {
  if (!items?.length) return null;

  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const Metric: React.FC<{ label: string; value?: number }> = ({ label, value }) => (
  <div className="rounded-md bg-gray-100 p-3 text-center">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value ?? 'N/A'}/10</p>
  </div>
);

export default MockInterview;

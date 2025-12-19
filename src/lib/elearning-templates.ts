// E-Learning Templates - Articulate Rise Style
// Interactive, modern course templates with progress tracking

import { Template } from './templates';

export const elearningTemplates: Template[] = [
  {
    id: 'course-platform',
    name: 'Course Platform',
    description: 'Complete e-learning platform with courses, lessons, and progress tracking',
    category: 'productivity',
    thumbnail: '🎓',
    features: [
      'Course catalog',
      'Lesson player',
      'Progress tracking',
      'Quizzes & assessments',
      'Certificates',
      'User dashboard',
      'Video support',
      'Supabase backend'
    ],
    hasSupabase: true,
    files: {
      'package.json': `{
  "name": "course-platform",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.39.0",
    "react-router-dom": "^6.20.1",
    "lucide-react": "^0.263.1",
    "framer-motion": "^10.16.16"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}`,
      'src/App.tsx': `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { Dashboard } from './pages/Dashboard'
import { CourseCatalog } from './pages/CourseCatalog'
import { CourseView } from './pages/CourseView'
import { LessonView } from './pages/LessonView'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return <Auth />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/courses" element={<CourseCatalog />} />
        <Route path="/course/:id" element={<CourseView />} />
        <Route path="/course/:courseId/lesson/:lessonId" element={<LessonView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App`,
      'src/pages/LessonView.tsx': `import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LessonPlayer } from '../components/LessonPlayer'
import { LessonSidebar } from '../components/LessonSidebar'
import { QuizModal } from '../components/QuizModal'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Award } from 'lucide-react'

export function LessonView() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [currentLesson, setCurrentLesson] = useState(null)
  const [progress, setProgress] = useState([])
  const [showQuiz, setShowQuiz] = useState(false)

  useEffect(() => {
    loadCourse()
    loadProgress()
  }, [courseId, lessonId])

  const loadCourse = async () => {
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order')

    setCourse(courseData)
    setLessons(lessonsData)
    
    const lesson = lessonsData.find(l => l.id === lessonId)
    setCurrentLesson(lesson)
  }

  const loadProgress = async () => {
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('course_id', courseId)

    setProgress(data || [])
  }

  const markComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('user_progress').upsert({
      user_id: user.id,
      course_id: courseId,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString()
    })

    loadProgress()

    // Check if lesson has quiz
    if (currentLesson?.has_quiz) {
      setShowQuiz(true)
    } else {
      goToNext()
    }
  }

  const goToNext = () => {
    const currentIndex = lessons.findIndex(l => l.id === lessonId)
    if (currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1]
      navigate(\`/course/\${courseId}/lesson/\${nextLesson.id}\`)
    } else {
      // Course complete!
      navigate(\`/course/\${courseId}?completed=true\`)
    }
  }

  const goToPrevious = () => {
    const currentIndex = lessons.findIndex(l => l.id === lessonId)
    if (currentIndex > 0) {
      const prevLesson = lessons[currentIndex - 1]
      navigate(\`/course/\${courseId}/lesson/\${prevLesson.id}\`)
    }
  }

  if (!currentLesson) return <div>Loading...</div>

  const isCompleted = progress.some(p => p.lesson_id === lessonId && p.completed)
  const currentIndex = lessons.findIndex(l => l.id === lessonId)

  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar */}
      <LessonSidebar
        course={course}
        lessons={lessons}
        currentLessonId={lessonId}
        progress={progress}
        onLessonClick={(id) => navigate(\`/course/\${courseId}/lesson/\${id}\`)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Lesson Content */}
        <div className="flex-1 overflow-y-auto">
          <LessonPlayer lesson={currentLesson} />
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="text-sm text-zinc-400">
              Lesson {currentIndex + 1} of {lessons.length}
            </div>

            {!isCompleted ? (
              <button
                onClick={markComplete}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition font-medium"
              >
                <Award className="h-4 w-4" />
                Complete & Continue
              </button>
            ) : (
              <button
                onClick={goToNext}
                disabled={currentIndex === lessons.length - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuiz && (
        <QuizModal
          lesson={currentLesson}
          onComplete={() => {
            setShowQuiz(false)
            goToNext()
          }}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  )
}`,
      'src/components/LessonPlayer.tsx': `import { motion } from 'framer-motion'
import { Play, FileText, Image, Video, CheckCircle } from 'lucide-react'

export function LessonPlayer({ lesson }) {
  const renderContent = () => {
    switch (lesson.content_type) {
      case 'video':
        return (
          <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden">
            <video
              src={lesson.video_url}
              controls
              className="w-full h-full"
              poster={lesson.thumbnail}
            />
          </div>
        )

      case 'text':
        return (
          <div className="prose prose-invert prose-purple max-w-none">
            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </div>
        )

      case 'interactive':
        return (
          <div className="space-y-6">
            {/* Interactive cards */}
            {lesson.interactive_blocks?.map((block, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
              >
                {block.type === 'accordion' && (
                  <details className="group">
                    <summary className="cursor-pointer text-lg font-semibold flex items-center justify-between">
                      {block.title}
                      <ChevronRight className="h-5 w-5 group-open:rotate-90 transition" />
                    </summary>
                    <div className="mt-4 text-zinc-400">
                      {block.content}
                    </div>
                  </details>
                )}

                {block.type === 'flip-card' && (
                  <div className="flip-card">
                    {/* Flip card implementation */}
                  </div>
                )}

                {block.type === 'tabs' && (
                  <div className="tabs">
                    {/* Tabs implementation */}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )

      default:
        return <div>Unknown content type</div>
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Lesson Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">
            {lesson.title}
          </h1>
          <p className="text-zinc-400 text-lg">
            {lesson.description}
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
            <span>{lesson.duration} min</span>
            <span>•</span>
            <span>{lesson.content_type}</span>
          </div>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Key Takeaways */}
        {lesson.key_takeaways && (
          <div className="mt-12 p-6 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-400" />
              Key Takeaways
            </h3>
            <ul className="space-y-2">
              {lesson.key_takeaways.map((takeaway, i) => (
                <li key={i} className="text-zinc-300 flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  )
}`,
      'src/components/QuizModal.tsx': `import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, Award } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function QuizModal({ lesson, onComplete, onClose }) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  const questions = lesson.quiz_questions || []

  const handleAnswer = (questionIndex, answerIndex) => {
    const newAnswers = [...answers]
    newAnswers[questionIndex] = answerIndex
    setAnswers(newAnswers)
  }

  const submitQuiz = async () => {
    // Calculate score
    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) {
        correct++
      }
    })

    const percentage = (correct / questions.length) * 100
    setScore(percentage)
    setShowResults(true)

    // Save quiz result
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      lesson_id: lesson.id,
      score: percentage,
      answers: answers
    })
  }

  if (showResults) {
    const passed = score >= 70

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-8 text-center"
        >
          <div className={\`h-20 w-20 mx-auto mb-6 rounded-full flex items-center justify-center \${
            passed ? 'bg-green-500/20' : 'bg-red-500/20'
          }\`}>
            {passed ? (
              <Award className="h-10 w-10 text-green-500" />
            ) : (
              <AlertCircle className="h-10 w-10 text-red-500" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {passed ? 'Great Job!' : 'Keep Learning'}
          </h2>

          <p className="text-zinc-400 mb-6">
            You scored {score.toFixed(0)}%
          </p>

          <div className="flex gap-3">
            {!passed && (
              <button
                onClick={() => {
                  setShowResults(false)
                  setCurrentQuestion(0)
                  setAnswers([])
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
            >
              Continue
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const question = questions[currentQuestion]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Knowledge Check</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: \`\${((currentQuestion + 1) / questions.length) * 100}%\` }}
          />
        </div>

        {/* Question */}
        <div className="p-8">
          <h3 className="text-lg font-medium text-white mb-6">
            {question.question}
          </h3>

          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(currentQuestion, i)}
                className={\`w-full p-4 text-left rounded-xl border-2 transition \${
                  answers[currentQuestion] === i
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/50'
                }\`}
              >
                <div className="flex items-center gap-3">
                  <div className={\`h-6 w-6 rounded-full border-2 flex items-center justify-center \${
                    answers[currentQuestion] === i
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-zinc-600'
                  }\`}>
                    {answers[currentQuestion] === i && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="text-white">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
          >
            Previous
          </button>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              disabled={answers.length !== questions.length}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition font-medium"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={answers[currentQuestion] === undefined}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              Next
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}`,
      'README.md': `# Course Platform

A complete e-learning platform inspired by Articulate Rise.

## Features

- 🎓 Course catalog with categories
- 📚 Lesson player with multiple content types
- ✅ Progress tracking
- 📝 Quizzes and assessments
- 🏆 Certificates on completion
- 👤 User dashboard
- 🎥 Video support
- 📊 Analytics

## Content Types

- Video lessons
- Text content
- Interactive blocks:
  - Accordions
  - Flip cards
  - Tabs
  - Image carousels
  - Process flows
  - Knowledge checks

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
    },
  },

  {
    id: 'microlearning-app',
    name: 'Microlearning App',
    description: 'Bite-sized lessons (5-10 min) with gamification and daily streaks',
    category: 'productivity',
    thumbnail: '⚡',
    features: [
      'Quick 5-10 min lessons',
      'Daily streaks',
      'Points & badges',
      'Leaderboard',
      'Push notifications',
      'Offline support',
      'Mobile-first'
    ],
    hasSupabase: true,
    files: {
      // Microlearning-specific implementation
    },
  },

  {
    id: 'compliance-training',
    name: 'Compliance Training',
    description: 'Corporate compliance training with mandatory completions and reporting',
    category: 'saas',
    thumbnail: '📋',
    features: [
      'Mandatory training',
      'Due date tracking',
      'Manager reports',
      'Completion certificates',
      'Policy acknowledgment',
      'Audit trail'
    ],
    hasSupabase: true,
    files: {
      // Compliance-specific implementation
    },
  },

  {
    id: 'skills-academy',
    name: 'Skills Academy',
    description: 'Skill-based learning paths with certifications and portfolios',
    category: 'productivity',
    thumbnail: '🎯',
    features: [
      'Learning paths',
      'Skill assessments',
      'Project portfolios',
      'Peer reviews',
      'Certificates',
      'Job board integration'
    ],
    hasSupabase: true,
    files: {
      // Skills academy implementation
    },
  },

  {
    id: 'onboarding-platform',
    name: 'Employee Onboarding',
    description: 'Interactive employee onboarding with checklists and team introductions',
    category: 'saas',
    thumbnail: '👋',
    features: [
      'Onboarding checklist',
      'Team directory',
      'Company culture',
      'First week tasks',
      'Meet the team',
      'Welcome videos'
    ],
    hasSupabase: true,
    files: {
      // Onboarding-specific implementation
    },
  },
];

// Supabase database schema for e-learning
export const elearningSchema = `
-- Courses table
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  category TEXT,
  difficulty TEXT,
  duration INTEGER, -- in minutes
  instructor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published BOOLEAN DEFAULT false
);

-- Lessons table
CREATE TABLE lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  content_type TEXT, -- 'video', 'text', 'interactive'
  video_url TEXT,
  thumbnail TEXT,
  duration INTEGER,
  order INTEGER,
  has_quiz BOOLEAN DEFAULT false,
  quiz_questions JSONB,
  key_takeaways TEXT[],
  interactive_blocks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Quiz results table
CREATE TABLE quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  score DECIMAL,
  answers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificates table
CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_url TEXT
);

-- Gamification table
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT, -- 'streak', 'completion', 'perfect_score'
  achievement_data JSONB,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "view_published_courses" ON courses FOR SELECT USING (published = true);
CREATE POLICY "view_course_lessons" ON lessons FOR SELECT USING (true);
CREATE POLICY "view_own_progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "update_own_progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
`;

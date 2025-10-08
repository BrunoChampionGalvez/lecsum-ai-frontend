"use client";

import Link from "next/link";
import { PublicRoute } from "../components/auth/PublicRoute";
import Image from "next/image";

export default function Home() {
  return (
    <PublicRoute>
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-[var(--primary)]">LecSum AI</span>
          </div>
          <nav className="flex space-x-4">
            <Link 
              href="/login"
              className="px-4 py-2 rounded-md text-[var(--primary)] hover:bg-[var(--light-blue)] transition-all duration-200"
            >
              Log in
            </Link>
            <Link 
              href="/signup"
              className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-all shadow-sm duration-200 font-medium"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--primary)]">
                Transform Your Study <span className="text-[var(--orange)]">Experience</span> with AI
              </h1>
              <p className="mt-6 text-lg text-[var(--foreground)]">
                LecSum AI helps students learn more effectively by generating custom flashcards, quizzes, and providing AI chat assistance based on your course materials.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link 
                  href="/signup" 
                  className="px-6 py-3 bg-[var(--orange)] text-white rounded-md hover:bg-[var(--orange-hover)] transition-all duration-200 font-medium shadow-md"
                >
                  Get Started Free
                </Link>
                <button className="px-6 py-3 bg-white text-[var(--primary)] rounded-md border border-gray-200 hover:bg-[var(--light-blue)] transition-all duration-200 font-medium shadow-sm">
                  Learn More
                </button>
              </div>
            </div>
            <Image
              width={600}
              height={400}
              className="rounded-lg shadow-xl"
              src="/hero-illustration.png"
              alt="LecSum AI Interface"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[var(--primary)]">Key Features</h2>
              <p className="mt-4 text-xl text-[var(--foreground)]">
                LecSum AI offers powerful tools to enhance your learning experience
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-50 hover:shadow-xl transition-all duration-300 hover:border-[var(--sky-light)]">
                <div className="h-14 w-14 bg-[var(--orange-light)] rounded-full flex items-center justify-center text-[var(--orange)] mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--primary)] mb-3">AI-Generated Flashcards</h3>
                <p className="text-[var(--foreground)]">
                  Transform your notes and documents into effective flashcards with multiple formats and difficulty levels.
                </p>
              </div>
            
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-50 hover:shadow-xl transition-all duration-300 hover:border-[var(--sky-light)]">
                <div className="h-14 w-14 bg-[var(--light-blue)] rounded-full flex items-center justify-center text-[var(--teal)] mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--primary)] mb-3">AI-Generated Quizzes</h3>
                <p className="text-[var(--foreground)]">
                  Test your knowledge with AI-generated quizzes based on your course materials.
                </p>
              </div>
            
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-50 hover:shadow-xl transition-all duration-300 hover:border-[var(--sky-light)]">
                <div className="h-14 w-14 bg-[var(--sky-light)] rounded-full flex items-center justify-center text-[var(--cyan)] mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--primary)] mb-3">AI Chat Assistant - Lecsi 👩🏻‍🦰</h3>
                <p className="text-[var(--foreground)]">
                  Ask questions about your materials and get instant, contextual answers from our AI.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-[var(--background)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[var(--primary)]">How It Works</h2>
              <p className="mt-4 text-xl text-[var(--foreground)]">
                Get started with LecSum AI in three simple steps
              </p>
            </div>
            
            {/* Centered steps with connecting lines */}
            <div className="max-w-4xl mx-auto mb-16 relative px-4">
              {/* Horizontal connecting line that spans across the steps - perfectly centered */}
              <div className="absolute w-[calc(100%-14rem)] left-1/2 transform -translate-x-1/2 top-8 h-1 bg-[var(--sky)] z-0 hidden md:block"></div>
              
              {/* Step circles and content */}
              <div className="flex flex-col md:flex-row justify-center items-start text-center md:space-x-20 lg:space-x-32">
                {/* Step 1 */}
                <div className="flex flex-col items-center w-full md:w-52">
                  <div className="h-16 w-16 bg-[var(--primary)] rounded-full flex items-center justify-center text-white mb-6 relative z-10 shadow-lg">
                    <span className="text-xl font-bold">1</span>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--primary)] mb-3">Upload Materials</h3>
                  <p className="text-[var(--foreground)] text-sm md:text-base">
                    Upload your lecture notes, textbooks, or any study materials in PDF, DOCX, or text format.
                  </p>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center w-full md:w-52 mt-16 md:mt-0">
                  <div className="h-16 w-16 bg-[var(--orange)] rounded-full flex items-center justify-center text-white mb-6 relative z-10 shadow-lg">
                    <span className="text-xl font-bold">2</span>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--primary)] mb-3">Generate Content</h3>
                  <p className="text-[var(--foreground)] text-sm md:text-base">
                    Our AI analyzes your materials and generates flashcards, quizzes, or chat responses.
                  </p>
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col items-center w-full md:w-52 mt-16 md:mt-0">
                  <div className="h-16 w-16 bg-[var(--teal)] rounded-full flex items-center justify-center text-white mb-6 relative z-10 shadow-lg">
                    <span className="text-xl font-bold">3</span>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--primary)] mb-3">Study Smarter</h3>
                  <p className="text-[var(--foreground)] text-sm md:text-base">
                    Use the generated content to study more effectively and improve your understanding.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-16 text-center">
              <Link href="/signup" className="inline-block px-8 py-4 bg-[var(--orange)] text-white rounded-md hover:bg-[var(--orange-hover)] transition-all duration-200 font-medium shadow-md text-lg">
                Get Started For Free
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-[var(--primary)] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Transform Your Learning?</h2>
            <p className="text-xl text-white opacity-90 mb-8 max-w-3xl mx-auto">
              Join thousands of students who are already studying smarter with LecSum AI.
            </p>
            <Link 
              href="/signup"
              className="inline-block px-8 py-4 rounded-md bg-white text-[var(--primary)] font-medium hover:bg-gray-100 transition-colors"
            >
              Get Started For Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--primary)] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-xl font-bold mb-4">LecSum AI</h3>
              <p className="text-[var(--sky-light)]">
                Your AI-powered study companion for more effective learning.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4">Features</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-[var(--sky-light)] hover:text-white transition-all">Flashcards</a></li>
                <li><a href="#" className="text-[var(--sky-light)] hover:text-white transition-all">Quizzes</a></li>
                <li><a href="#" className="text-[var(--sky-light)] hover:text-white transition-all">AI Chat</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-[var(--sky-light)] hover:text-white transition-all">About</a></li>
                <li><a href="#" className="text-[var(--sky-light)] hover:text-white transition-all">Privacy Policy</a></li>
                <li><a href="#" className="text-[var(--sky-light)] hover:text-white transition-all">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4">Get Started</h3>
              <ul className="space-y-3">
                <li><Link href="/signup" className="text-[var(--sky-light)] hover:text-white transition-all">Sign Up</Link></li>
                <li><Link href="/login" className="text-[var(--sky-light)] hover:text-white transition-all">Log In</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-blue-800">
            <p className="text-[var(--sky-light)]"> {new Date().getFullYear()} LecSum AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
    </PublicRoute>
  );
}

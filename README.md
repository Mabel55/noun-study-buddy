# 🎓 NOUN Study Buddy

> An intelligent, AI-driven learning companion designed exclusively for students at the National Open University of Nigeria (NOUN). 

**NOUN Study Buddy** bridges the gap between massive course materials and effective exam preparation. By combining advanced AI-generated course summaries with an interactive mock exam engine, it provides students with a targeted, stress-free way to study for both CBT (Computer-Based Testing) and POP (Pen-On-Paper) examinations.

---

## ✨ Key Features

### 🤖 AI-Powered Content & Summaries
* Distills dense university study materials into highly readable chapter summaries.
* Powered by **Retrieval-Augmented Generation (RAG)** to ensure the AI strictly references official NOUN textbooks and course materials without hallucinating.
* Utilizes **LangChain** and **Advanced Prompt Engineering** to orchestrate complex LLM workflows, generating highly accurate model answers for essay questions.
* Built with principles of **RLHF (Reinforcement Learning from Human Feedback)** to ensure the grading logic and generated content continuously align with academic standards.

### 🧠 The Practice Center
* A self-paced study environment tailored for deep learning and memorization.
* **POP Essay Mode:** Displays essay questions and allows students to reveal the AI-generated model answers at their own pace.
* **CBT & Fill-in-the-gap:** Practice multiple-choice questions with instant correct/incorrect feedback.

### ⏱️ Timed Mock Exam Simulator
* A strict, timed simulation mirroring the actual NOUN CBT exam hall experience.
* Features a ticking countdown timer (standardized to 45 minutes).
* Auto-grades CBT and Fill-in-the-gap questions upon submission or when the timer reaches zero.
* Provides a final percentage score and locks answers to maintain exam integrity.

---

## 🛠️ Technology Stack

This project is built using a modern decoupled architecture, separating the mobile frontend from the AI-powered backend API.

**Artificial Intelligence & Data Processing**
* **Orchestration:** LangChain
* **Architecture:** Retrieval-Augmented Generation (RAG)
* **Optimization:** Prompt Engineering & RLHF principles

**Frontend (Mobile App)**
* **Framework:** React Native / Expo
* **Language:** TypeScript
* **Routing:** Expo Router (File-based navigation)
* **UI/UX:** Custom React Native StyleSheet with SafeAreaView optimization

**Backend (API)**
* **Framework:** Django & Django REST Framework (DRF)
* **Language:** Python
* **Database:** SQLite (Development) / PostgreSQL (Production ready)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (3.10 or higher)
* **Expo CLI** (`npm install -g expo-cli`)

### 1. Backend Setup (Django)
Navigate to the backend directory and start the server:

```bash
# Install required Python packages
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start the Django server
python manage.py runserver

# Install dependencies
npm install

# Start the Expo development server
npx expo start -c

🏗️ Project Architecture Note
To ensure seamless communication between the React Native frontend and the Django backend during local web testing, API fetch requests are currently routed through http://localhost:8000

👨‍💻 Author
Arua Mabel Chinasa Computer Science, National Open University of Nigeria (NOUN)
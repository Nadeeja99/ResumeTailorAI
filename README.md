# ResumeTailorAI 🚀

> **AI-Powered Resume Optimization Tool** - Transform your resume with intelligent analysis and data-driven improvements to land your dream job.

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)

## ✨ Features

### 🎯 **Smart Resume Analysis**
- **AI-Powered Analysis**: Advanced AI analyzes your resume against job descriptions
- **Keyword Matching**: Identifies missing keywords and skills alignment
- **ATS Optimization**: Ensures your resume passes Applicant Tracking Systems
- **Professional Improvements**: Generates optimized resume versions with actionable suggestions

### 📊 **Comprehensive Insights**
- **Match Score**: Percentage-based compatibility with job requirements
- **Missing Keywords**: Specific keywords you should add to your resume
- **Strengths Analysis**: Highlights your resume's strong points
- **Tone Analysis**: Evaluates professionalism and clarity
- **ATS Optimization Score**: Ensures ATS system compatibility

### 🚀 **User Experience**
- **Real-time Feedback**: Instant analysis with detailed breakdowns
- **Modern UI**: Clean, professional interface built with shadcn/ui
- **Responsive Design**: Works seamlessly on desktop and mobile
- **One-Click Optimization**: Generate improved resume versions instantly

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **AI Service**: Google Gemini AI
- **State Management**: React Hooks
- **Routing**: React Router DOM

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Gemini API key from Google AI Studio

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ResumeTailorAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the environment file
   cp .env .env.local
   
   # Edit .env.local with your API key
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔑 API Key Setup

### Getting Your Gemini API Key

1. **Visit Google AI Studio**
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Sign in with your Google account

2. **Create API Key**
   - Click "Get API Key" or "Create API Key"
   - Copy the generated API key

3. **Configure Environment**
   ```bash
   # In your .env.local file
   VITE_GEMINI_API_KEY=AIzaSyC...your_actual_key_here
   ```

### Security Notes
- ✅ `.env.local` is automatically ignored by git
- ✅ API keys are never exposed in the frontend code
- ✅ Environment variables are only accessible at build time

## 📖 Usage Guide

### 1. **Prepare Your Resume**
- Copy your resume text into the left panel
- Ensure it's in plain text format for best analysis

### 2. **Add Job Description**
- Paste the job description in the right panel
- Include the full job posting for comprehensive analysis

### 3. **Analyze Your Resume**
- Click "Analyze Resume" to get instant feedback
- Review the detailed analysis and suggestions

### 4. **Generate Optimized Version**
- Click "Generate Optimized Resume" to create an improved version
- The AI will incorporate all suggestions and improvements

### 5. **Review and Download**
- Compare the original and optimized versions
- Download or copy the improved resume

## 🎯 Analysis Features

### **Match Score (0-100)**
- Overall compatibility with job requirements
- Based on keyword matching and skills alignment

### **Missing Keywords**
- Specific terms from the job description not found in your resume
- Prioritized by importance and frequency

### **Suggested Improvements**
- Actionable recommendations to enhance your resume
- Focused on impact, clarity, and ATS optimization

### **Strengths Analysis**
- Highlights your resume's strong points
- Identifies areas where you excel

### **Tone Analysis**
- Evaluates professionalism and clarity
- Provides feedback on writing style

### **ATS Optimization**
- Ensures compatibility with Applicant Tracking Systems
- Suggests format and keyword optimizations

## 🏗️ Project Structure

```
ResumeTailorAI/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── AnalysisResults.tsx
│   │   ├── JobDescriptionInput.tsx
│   │   ├── ResumeInput.tsx
│   │   └── ResumePreview.tsx
│   ├── pages/              # Page components
│   │   ├── Index.tsx       # Main application page
│   │   └── NotFound.tsx
│   ├── services/           # API services
│   │   └── gemini.ts       # Gemini AI service
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions
├── public/                 # Static assets
├── .env                    # Environment template
└── package.json           # Dependencies and scripts
```

## 🚀 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key | ✅ |

### Build Configuration

The project uses Vite for fast development and optimized builds:

- **Development**: Hot module replacement, fast refresh
- **Production**: Optimized bundles, tree shaking
- **TypeScript**: Full type safety and IntelliSense

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for providing the AI analysis capabilities
- **shadcn/ui** for the beautiful component library
- **Tailwind CSS** for the utility-first CSS framework
- **Vite** for the fast build tooling

## 📞 Support

If you encounter any issues or have questions:

1. **Check the console** for detailed error messages
2. **Verify your API key** is correctly set in `.env.local`
3. **Ensure you have** the latest version of Node.js
4. **Open an issue** on GitHub with detailed information

---

**Made with ❤️ for job seekers everywhere**

*Transform your resume, land your dream job!*

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1e8286dc-3896-42fe-a2ea-a37c3a853abd) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1e8286dc-3896-42fe-a2ea-a37c3a853abd) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

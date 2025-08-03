# ResumeTailorAI

An AI-powered resume optimization tool that analyzes job descriptions and provides data-driven improvements to help you land your dream job.

## Features

- **Smart Resume Analysis**: AI analyzes your resume against job descriptions
- **Keyword Matching**: Identifies missing keywords and skills alignment
- **ATS Optimization**: Ensures your resume passes Applicant Tracking Systems
- **Professional Improvements**: Generates optimized resume versions
- **Real-time Feedback**: Instant analysis with actionable suggestions

## Environment Setup

Before running the application, you need to set up your Gemini API key:

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create a new API key for Gemini

2. **Configure Environment Variables**:
   - Copy the `.env` file and rename it to `.env.local`
   - Replace `your_gemini_api_key_here` with your actual API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Security Note**: 
   - Never commit your `.env.local` file to version control
   - The `.env` file is already in `.gitignore` for security

## Project info

**URL**: https://lovable.dev/projects/1e8286dc-3896-42fe-a2ea-a37c3a853abd

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

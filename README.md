# AI Assistant Chatbot (Supabase + Gemini)

A production-ready AI chatbot architecture with persistent conversation history, multiple conversations per user, and a clean, modern UI.

## Features

- **Persistent Storage**: All users, conversations, and messages are stored in Supabase (PostgreSQL).
- **AI Powered**: Uses Google Gemini 1.5 Flash for intelligent responses.
- **Multi-Conversation**: Users can maintain multiple separate chat threads.
- **Clean Architecture**: Modular structure with separate services, types, and components.
- **Modern UI**: Built with React, Tailwind CSS, and Lucide icons.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Express (Node.js)
- **Database**: Supabase
- **AI**: Google Gemini API

## Setup Instructions

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and run the contents of `supabase_schema.sql`.
3. Go to **Project Settings > API** to get your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### 2. Environment Variables
Configure the following in your AI Studio Secrets or `.env` file:
- `GEMINI_API_KEY`: Your Google AI API key.
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key.

### 3. Run Locally
```bash
npm install
npm run dev
```

## Database Schema

- `users`: Stores user profiles (username-based login).
- `conversations`: Stores chat threads linked to users.
- `messages`: Stores individual messages (role: user/assistant).

## Deployment

This app is ready to be deployed to any platform that supports Node.js. The `npm run build` command will generate a production-ready bundle.

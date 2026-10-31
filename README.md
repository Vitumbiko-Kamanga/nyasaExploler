# Mthandizi 🇲🇼 — Conversation Memory Update

This version keeps the existing React + Vite frontend and Express + Groq backend.

## What's fixed

1. **Multiple conversations:** create, switch between, rename and delete independent chats.
2. **Persistent chat history:** every conversation, its messages and its own compact memory are saved in localStorage and restored after refresh.
3. **Per-chat rolling memory:** each conversation has its own memory summary; switching chats never mixes their contexts.
4. **Bounded context:** recent messages and the memory summary have configurable size limits.
5. **Malawi geography grounding:** the system prompt now includes all 28 districts and their region assignments, including the Mulanje/Mzimba distinction.
6. **Lower response randomness:** temperature reduced to 0.2 to encourage more consistent factual responses.

## Run

1. Extract this ZIP.
2. Copy `server/.env.example` to `server/.env`.
3. Put your real Groq API key in `server/.env`.
4. Open a terminal in the project root and run:

```bash
npm install
npm run install:all
npm run dev
```

5. Open http://localhost:5173.

API health check: http://localhost:5000/api/health

## Memory behaviour

- The current conversation and compact summary are stored in this browser's localStorage.
- The backend creates/updates a summary from older turns when a conversation grows.
- The model receives the summary plus the latest 10 messages.
- Clicking **New conversation** clears the active conversation and its memory summary.
- Browser localStorage is device/browser-specific. It does not sync across devices or browsers.
- Clearing browser data removes locally saved conversations.
- This is not yet a multi-user database or cross-device memory service.

## Important limitations and next phase

The district reference is a small trusted fact set, not a complete Malawi knowledge base. Mthandizi is not fine-tuned on Malawi data and does not yet use RAG. For broader accuracy, the next phase should add curated, dated sources (for example, National Statistical Office publications and official ministry documents), document retrieval, source citations and tests for Chichewa quality.

Groq HTTP 200 means the API request succeeded; it does not prove that the generated answer is factually correct. Always verify important information.

Keep `server/.env` private. Never expose your API key in frontend code or commit it to Git.


## Multiple conversations

The sidebar now contains a **Your Chats** list. Each chat has a separate message history and separate rolling memory summary. Users can create a new conversation, reopen an earlier one, rename it, or delete it. The selected conversation is restored after a refresh.

This first multi-chat implementation stores data in browser localStorage. Chats are retained in the same browser profile on the same device; they are not yet synced across devices or shared between different user accounts. A production deployment should migrate chat storage to a database with authenticated user ownership.


## Mthandizi agent skill

The reusable skill is stored at:

`skills/mthandizi-malawi-expert/SKILL.md`

The Express server loads this file at startup and injects its instructions into the Groq system prompt. This is the runtime integration that makes the skill affect Mthandizi's answers. The `skills` CLI installation is separately useful for coding agents working on this repository.

To install the skill into a supported coding agent from the project root:

```bash
npx skills add ./skills/mthandizi-malawi-expert
```

See `skills/mthandizi-malawi-expert/PUBLISHING.md` for the steps to publish it through a public GitHub repository so others can install it through skills.sh.

The skill improves response procedure and consistency; it does not itself add live web search, a full Malawi knowledge database, or verified up-to-date facts.

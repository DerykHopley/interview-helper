Interview Practice app (This is an educational experimental project for me)
- Set My Job title, industry, my values, store my previous experiance as scenarios for specific types of questions etc.
    Upload CV
- Ask common questions for a specific type of interview and job type
- Guide to add context to a question being asked.
    I have several scenarios over my career to reference as real world experience
    When a question is asked I'd like the app to quickly show which scenario matches the question.
- Build an interview process around a job spec
- Compare a job spec to experience and evaluate if the job matches my skills
- evaluate the company to match my values and if I would fit there
- Text and Voice interactions
- Different LLMs models for specific intereactions using openrouter
    e.g. JEV as a classifier for scenario matching, 
- secure encrypted personal data

- During Development 
    - processes should include LLM as a judge steps to evaluate different LLMs for different functionality
    - TDD
    - Prompt injection hardening
    - Code review

- Architecture
  - to be confirmed after we know all the features. I would like it to be as simple and static as possible. Possibly run in the browser with local browser storage. But open to sqlite database etc. 
  - As this is a learning app it needs to be as cheap as possible
  - localhost then possibly use Cloudflare pages

Bonus: (order by difficulty of implementation and how much it would change core functionality to implement)
Live voice interview. Speak with the interviewer, receive spoken responses, and review the transcript and feedback afterward. Support interruptions as an extra challenge.

A continuing interview coach. Remember previous sessions, track recurring weaknesses, and tailor future practice. Let users inspect, correct, and delete stored information.

Importable interview packs. Allow users to add role-specific packs containing interview instructions, evaluation rubrics, and example exercises without modifying application code.

CV and job-description tailoring. Upload a CV and job description to generate an interview tailored to the role, the candidate’s experience, and gaps between the two.

Adaptive follow-up questions. Ask targeted follow-ups based on the candidate’s actual answer: probe vague claims, request examples, explore trade-offs, and adjust difficulty.

Evidence-based feedback dashboard. Present feedback by competency, linking each assessment to excerpts from the candidate’s answers. Include suggested exercises and the ability to retry a skill.

Coding interview workspace. Combine a code editor and test results with an interviewer that discusses the candidate’s approach and asks questions about their solution.

Presentation practice. Let candidates upload slides, deliver a presentation, and answer follow-up questions about its content.

Interview playback and retries. Save a session with feedback attached to individual answers. Let candidates revisit an answer, retry it, and compare attempts.

A practice loop that checks improvement. Identify a weakness, provide a targeted exercise, and test the same skill with a fresh question.

Offline interview mode. Run interviews and generate feedback using a local model. Store sessions locally and demonstrate the complete experience without an internet connection after setup.

An interviewer that controls the practice workspace. Use function calling to open exercises, start timed rounds, retrieve previous attempts, and save practice assignments during a conversation.

A coach that preserves real experience. Help candidates improve their answers without inventing achievements, metrics, or responsibilities. Ask for missing facts before suggesting a rewrite.

An interviewer that challenges bluffing. Probe confident but unsupported answers and distinguish polished wording from demonstrated understanding.

# Custom Agent Guidelines

## Collaborative Debugging Rules
- If a bug or feature is not successfully resolved after 2 code iterations, the agent MUST stop proposing immediate code changes or guess-fixes.
- Instead, the agent must write diagnostic logs, print statements, or helper scripts to gather information.
- Ask the user to run the game, check the browser developer console, and paste the exact logs or stack traces.
- Treat debugging as a collaborative, two-way partnership: prioritize analysis and diagnostic requests over guesswork.

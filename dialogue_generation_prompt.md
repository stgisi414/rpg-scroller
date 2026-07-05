# Dialogue Generation Prompt

To generate a custom dialogue pattern JSON database for the RPG Scroller cutscene system, use the following prompt with an LLM (such as Gemini or Deepthink).

---

## Prompt for LLM Dialogue Generation

Please generate a JSON database containing varied dialogue patterns for 7 specific in-game situations (categories):
1. `town_entrance`
2. `rival_ambush`
3. `boss_monologue`
4. `heaven_encounter`
5. `hell_encounter`
6. `throne_room_entrance`
7. `guard_warning`

### Output Format and Schema
Your output must be a single JSON object. The keys of the object are the 7 categories above.
Each category must map to a JSON array containing at least 2 distinct dialogue pattern arrays.
Each dialogue pattern is an array of dialogue line objects.
Each line object must have:
- `speaker` (string): The name of the speaker, or a placeholder like `{playerName}` or `{rivalName}`.
- `text` (string): The spoken dialogue text, containing relevant placeholders where appropriate.
- `portrait` (string, optional): The portrait sprite key or a placeholder like `{rivalPortrait}`.
- `side` (string, optional): Either `"left"` or `"right"`, indicating which side of the screen the portrait should appear.

### Placeholders to Use
Incorporate the following placeholders exactly as written:
- `{kingdomName}`: Name of the current kingdom.
- `{leaderName}`: Name of the kingdom's ruler.
- `{factionName}`: Faction name.
- `{rivalName}`: The name of the player's rival.
- `{rivalClass}`: The character class of the rival.
- `{rivalPortrait}`: The portrait graphic key of the rival.
- `{zoneName}`: The name of the current area or zone.
- `{reason}`: A contextual reason or motive.
- `{playerName}`: The player's custom character name.

### Example Schema Structure
```json
{
  "town_entrance": [
    [
      {
        "speaker": "Guard",
        "text": "Halt! You have entered {kingdomName}. What business do you have here, {playerName}?",
        "portrait": "npc_guard",
        "side": "left"
      },
      {
        "speaker": "{playerName}",
        "text": "Just passing through to meet {leaderName}.",
        "portrait": "player_portrait",
        "side": "right"
      }
    ],
    [
      ...
    ]
  ],
  ...
}
```

Please ensure all JSON is valid, fully-formed, and matches the categories and placeholder syntax exactly.

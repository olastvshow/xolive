
- Couples prompt banks live in code (src/games/couples/banks.ts); the server records used prompts per pair in seen_prompts so rounds never repeat until a bank is exhausted. Why: one shared source for solo and room play.
- Hidden games use the registry `hidden` flag (GAMES lists only visible ones; gameByKey still resolves hidden ones). Why: running sessions keep working.

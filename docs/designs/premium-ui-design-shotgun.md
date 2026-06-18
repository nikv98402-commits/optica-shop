# Design Shotgun: ViLu Premium UI Directions

Status: ready for selection  
Branch: `codex/premium-ui-redesign-plan`  
Date: 2026-06-18  
Inputs:

- `docs/designs/premium-ui-redesign-plan.md`
- `docs/designs/premium-ui-redesign-eng-review.md`
- `docs/designs/premium-ui-redesign-design-review.md`

## Why This Exists

The prior reviews established that ViLu should move away from a loud demo landing page toward a precise, premium optical assistant. This shotgun creates three distinct visual directions so the team can choose one before touching production UI.

## Recommendation

Recommended direction: **B — Product-Led Try-On Cockpit**, borrowing restraint from **A — Premium Optical Minimalism**.

Why:

- ViLu's wedge is not fashion mood or a generic shop; it is the online-to-salon decision flow.
- Direction B makes the actual product state visible immediately: photo, frame, score, saved count, salon action.
- Direction A supplies the needed premium restraint: calmer typography, cleaner cards, less beige dominance.
- Direction C is useful for partner/salon surfaces, but too boutique-led for the whole product.

## Direction A — Premium Optical Minimalism

Visual idea: calm premium retail, lots of white/off-white space, precise typography, restrained green trust accents, amber used only for primary conversion.

Best for:

- making ViLu feel more expensive and trustworthy;
- fixing the current oversized/amateur hero impression;
- Knowledge Base and dashboard surfaces;
- product pages where clarity matters.

Risks:

- can become too quiet and under-explain the unique try-on/salon flow;
- may feel like a premium eyewear catalog if the product journey is not prominent enough.

Use these patterns:

- smaller hero H1;
- clean two-column composition;
- white product-state card;
- trust copy near CTA;
- measured typography and border/light-shadow discipline.

## Direction B — Product-Led Try-On Cockpit

Visual idea: the first viewport looks like a working decision tool. It shows the user's path: photo, Face-fit score, saved frames, nearby salons.

Best for:

- communicating ViLu's unique wedge in the first five seconds;
- increasing start-try-on conversion;
- making analytics funnel stages visually obvious;
- reducing the risk of becoming another eyewear catalog.

Risks:

- can feel too SaaS/tool-like if product imagery and warmth are weak;
- requires careful responsive design so the cockpit does not overcrowd mobile.

Use these patterns:

- four-step journey rail;
- product preview with realistic UI state;
- saved-selection sticky tray;
- score card with limitations;
- salon action preview directly connected to saved frames.

## Direction C — Boutique Salon Preparation

Visual idea: premium salon/retail visit prep. The interface feels like a curated appointment assistant that gets the user ready for a real optical visit.

Best for:

- partner optics positioning;
- salon cards and route/contact actions;
- trust with users who prefer in-person fitting;
- later B2B partner pages.

Risks:

- weakens online try-on if used as the main home direction;
- can drift toward generic local service marketplace.

Use these patterns:

- editorial salon visit checklist;
- selected frames as appointment prep;
- partner/listed status clarity;
- action cards for route/call/messenger/copy;
- warm but restrained local-service language.

## Comparison Matrix

| Criterion | A Minimalism | B Cockpit | C Boutique |
|---|---:|---:|---:|
| Premium feel | 9 | 8 | 8 |
| Explains unique product | 7 | 10 | 8 |
| Conversion clarity | 8 | 9 | 8 |
| Mobile risk | 8 | 6 | 7 |
| Brand differentiation | 7 | 10 | 8 |
| Knowledge Base fit | 9 | 7 | 7 |
| Salon flow fit | 7 | 9 | 10 |
| Overall | 8 | 9 | 8 |

## Final Choice To Carry Forward

Choose **B + A**:

- home and try-on: Product-Led Try-On Cockpit;
- visual restraint, typography, palette: Premium Optical Minimalism;
- salon cards: borrow Boutique Salon Preparation details.

## Implementation Notes

1. Build hero around real product state, not decorative imagery.
2. Reduce hero type scale and make line breaks controlled.
3. Use a four-step rail: `Фото`, `Face-fit`, `Подбор`, `Салон`.
4. Add sticky saved-selection tray after first save.
5. Use bottom sheet for salons on mobile.
6. Keep amber for primary actions only.
7. Use mineral green for trust/selection/partner states.
8. Keep dashboard and Knowledge Base visually calmer than the home cockpit.

## Next Step

Create implementation branch from `main` after this planning branch is reviewed. Recommended first implementation PR: design tokens + home hero only. Do not redesign every screen in one PR.
